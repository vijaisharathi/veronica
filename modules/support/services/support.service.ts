/**
 * VÉRONA — Support Service Facade (Phase 26)
 *
 * Central authoritative orchestrator for Customer Support tickets,
 * customer conversations, staff replies, internal notes, assignments,
 * SLA evaluations, and anti-IDOR security.
 */

import {
  SupportTicketModel,
  SupportMessageModel,
  CustomerModel,
  StaffModel,
  AuditLogModel,
} from "@/db/models";
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
  SupportSenderType,
  SupportMessageType,
} from "@/constants/status";
import {
  CustomerSupportTicketDTO,
  CustomerSupportTicketDetailDTO,
  AdminSupportTicketDTO,
  AdminSupportTicketDetailDTO,
  AdminSupportStatsDTO,
  CreateTicketInput,
  CustomerReplyInput,
  AgentReplyInput,
  InternalNoteInput,
  AssignTicketInput,
  UpdateStatusInput,
  UpdatePriorityInput,
  SupportTicketFilter,
  CustomerTicketFilter,
} from "../types/support.types";
import {
  assertValidTicketTransition,
  canCustomerReply,
  canCustomerClose,
  canCustomerReopen,
} from "../state-machine/support-state-machine";
import { generateTicketNumber } from "./ticket-number.service";
import { slaService } from "./sla.service";
import { supportContextService } from "./support-context.service";
import { supportAttachmentService } from "./support-attachment.service";
import { supportEventService } from "./support-event.service";
import { supportRepository, PaginatedResult } from "../repositories/support.repository";
import {
  CreateTicketSchema,
  CustomerReplySchema,
  AgentReplySchema,
  InternalNoteSchema,
  AssignTicketSchema,
  UpdateStatusSchema,
  UpdatePrioritySchema,
} from "../validators/support.validators";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class SupportService {
  // ── Customer Operations ──────────────────────────────────────────────────────

  /**
   * Creates a new support ticket initiated by an authenticated customer.
   */
  async createTicket(
    paramsOrCustomerId:
      | string
      | {
          customerId: string;
          customerEmail?: string;
          input: CreateTicketInput;
          idempotencyKey?: string;
        },
    maybeInput?: CreateTicketInput
  ): Promise<CustomerSupportTicketDetailDTO> {
    const customerId =
      typeof paramsOrCustomerId === "string" ? paramsOrCustomerId : paramsOrCustomerId.customerId;
    const rawInput =
      typeof paramsOrCustomerId === "string"
        ? maybeInput || ({} as CreateTicketInput)
        : {
            ...paramsOrCustomerId.input,
            idempotencyKey: paramsOrCustomerId.idempotencyKey || paramsOrCustomerId.input.idempotencyKey,
          };
    const input = CreateTicketSchema.parse(rawInput);

    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await SupportTicketModel.findOne({
        customerId,
        idempotencyKey: input.idempotencyKey,
      }).lean();

      if (existing) {
        logger.info("Idempotent ticket creation bypass", {
          context: "SupportService",
          metadata: { ticketNumber: existing.ticketNumber, idempotencyKey: input.idempotencyKey },
        });
        const detail = await this.getCustomerTicketDetail(existing.ticketNumber, customerId);
        if (detail) return detail;
      }
    }

    // 2. Validate Context Ownership (Order, Shipment, Return, Refund, Product anti-IDOR)
    await supportContextService.validateContextOwnership(customerId, {
      orderId: input.orderId,
      shipmentId: input.shipmentId,
      returnRequestId: input.returnRequestId,
      refundId: input.refundId,
      productId: input.productId,
    });

    // 3. Validate Attachments
    if (input.attachments && input.attachments.length > 0) {
      supportAttachmentService.validateAttachments(input.attachments);
    }

    const priority = input.priority || SupportTicketPriority.MEDIUM;
    const now = new Date();
    const { firstResponseDeadline, resolutionDeadline } = slaService.calculateDeadlines(now, priority);

    // 4. Generate unique ticket number
    let ticketNumber = generateTicketNumber();
    let collisionCheck = await SupportTicketModel.findOne({ ticketNumber }).select("_id").lean();
    let attempts = 0;
    while (collisionCheck && attempts < 5) {
      ticketNumber = generateTicketNumber();
      collisionCheck = await SupportTicketModel.findOne({ ticketNumber }).select("_id").lean();
      attempts++;
    }

    // 5. Persist Ticket Document
    const ticketDoc = await SupportTicketModel.create({
      ticketNumber,
      customerId,
      category: input.category,
      subject: input.subject,
      priority,
      status: SupportTicketStatus.OPEN,
      orderId: input.orderId || null,
      relatedOrderId: input.orderId || null,
      shipmentId: input.shipmentId || null,
      returnRequestId: input.returnRequestId || null,
      refundId: input.refundId || null,
      productId: input.productId || null,
      lastMessageAt: now,
      slaFirstResponseDeadline: firstResponseDeadline,
      slaResolutionDeadline: resolutionDeadline,
      idempotencyKey: input.idempotencyKey || null,
    });

    // 6. Resolve customer display name
    const customer = await CustomerModel.findById(customerId).select("firstName lastName").lean();
    const senderDisplayName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client"
      : "Client";

    // 7. Persist Initial Message
    await SupportMessageModel.create({
      ticketId: ticketDoc._id,
      senderType: SupportSenderType.CUSTOMER,
      senderId: customerId,
      senderDisplayName,
      messageType: SupportMessageType.MESSAGE,
      body: input.message,
      message: input.message,
      attachments: input.attachments || [],
      isInternal: false,
    });

    // 8. Audit Log
    await AuditLogModel.create({
      actor: { id: customerId, type: "CUSTOMER" },
      action: "SUPPORT_TICKET_CREATED",
      entity: "SupportTicket",
      entityId: ticketDoc._id.toString(),
      metadata: {
        ticketNumber,
        category: input.category,
        priority,
      },
    }).catch(() => null);

    // 9. Emit Domain Event
    await supportEventService.emitEvent({
      eventId: `evt_${Date.now()}_${ticketDoc._id}`,
      eventType: "support.ticket_created",
      ticketId: ticketDoc._id.toString(),
      ticketNumber,
      customerId,
      subject: input.subject,
      category: input.category,
      occurredAt: now,
    });

    logger.info(`Support ticket created: #${ticketNumber}`, {
      context: "SupportService",
      metadata: { ticketNumber, customerId, category: input.category },
    });

    const createdDetail = await this.getCustomerTicketDetail(ticketNumber, customerId);
    if (!createdDetail) {
      throw new Error("Failed to load newly created ticket detail");
    }
    return createdDetail;
  }

  /**
   * Convenience wrapper for customer reply with object params.
   */
  async addCustomerReply(params: {
    customerId: string;
    ticketNumber: string;
    input: CustomerReplyInput;
    idempotencyKey?: string;
  }): Promise<CustomerSupportTicketDetailDTO> {
    return this.customerReply(params.ticketNumber, params.customerId, {
      ...params.input,
      idempotencyKey: params.idempotencyKey || params.input.idempotencyKey,
    });
  }

  /**
   * Submits a customer reply to an active support conversation.
   */
  async customerReply(
    ticketNumber: string,
    customerId: string,
    rawInput: CustomerReplyInput
  ): Promise<CustomerSupportTicketDetailDTO> {
    const input = CustomerReplySchema.parse(rawInput);

    const ticket = await SupportTicketModel.findOne({
      ticketNumber,
      customerId, // Strict anti-IDOR guard
    });

    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    if (!canCustomerReply(ticket.status as SupportTicketStatus)) {
      throw new ValidationError(
        `Cannot reply to a ticket in '${ticket.status}' status. Please reopen the ticket if further assistance is needed.`
      );
    }

    // Attachments validation
    if (input.attachments && input.attachments.length > 0) {
      supportAttachmentService.validateAttachments(input.attachments);
    }

    const customer = await CustomerModel.findById(customerId).select("firstName lastName").lean();
    const senderDisplayName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client"
      : "Client";

    const now = new Date();

    // Persist customer reply message
    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderType: SupportSenderType.CUSTOMER,
      senderId: customerId,
      senderDisplayName,
      messageType: SupportMessageType.MESSAGE,
      body: input.message,
      message: input.message,
      attachments: input.attachments || [],
      isInternal: false,
      idempotencyKey: input.idempotencyKey || null,
    });

    // If ticket was waiting for customer, flip status back to IN_PROGRESS
    const targetStatus =
      ticket.status === SupportTicketStatus.WAITING_FOR_CUSTOMER
        ? SupportTicketStatus.IN_PROGRESS
        : ticket.status;

    ticket.status = targetStatus;
    ticket.lastMessageAt = now;
    await ticket.save();

    // Emit Domain Event
    await supportEventService.emitEvent({
      eventId: `evt_${Date.now()}_reply_${ticket._id}`,
      eventType: "support.customer_replied",
      ticketId: ticket._id.toString(),
      ticketNumber,
      customerId,
      occurredAt: now,
    });

    const updated = await this.getCustomerTicketDetail(ticketNumber, customerId);
    if (!updated) {
      throw new Error("Failed to load updated customer ticket detail");
    }
    return updated;
  }

  /**
   * Retrieves paginated tickets for the customer dashboard.
   */
  async getCustomerTickets(
    customerId: string,
    filter: CustomerTicketFilter = {}
  ): Promise<PaginatedResult<CustomerSupportTicketDTO>> {
    return supportRepository.listCustomerTickets(customerId, filter);
  }

  /**
   * Retrieves single ticket detail for customer view with context and sanitized messages.
   */
  async getCustomerTicketDetail(
    ticketNumber: string,
    customerId: string
  ): Promise<CustomerSupportTicketDetailDTO | null> {
    const result = await supportRepository.getCustomerTicketByNumber(ticketNumber, customerId);
    if (!result) return null;

    const { ticket, messages } = result;
    const context = await supportContextService.loadTicketContext(ticket);

    const orderId = ticket.orderId || ticket.relatedOrderId;

    return {
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category: ticket.category as SupportCategory,
      priority: ticket.priority as SupportTicketPriority,
      status: ticket.status as SupportTicketStatus,
      hasOrderContext: Boolean(orderId),
      orderNumber: context.order?.orderNumber,
      lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : ticket.createdAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      context,
      messages,
      canReply: canCustomerReply(ticket.status as SupportTicketStatus),
      canClose: canCustomerClose(ticket.status as SupportTicketStatus),
      canReopen: canCustomerReopen(ticket.status as SupportTicketStatus, ticket.closedAt),
    };
  }

  /**
   * Customer closes an active ticket.
   */
  async customerCloseTicket(
    paramsOrTicketNumber:
      | string
      | {
          customerId: string;
          ticketNumber: string;
          reason?: string;
        },
    maybeCustomerId?: string,
    maybeReason?: string
  ): Promise<CustomerSupportTicketDetailDTO> {
    const ticketNumber =
      typeof paramsOrTicketNumber === "string" ? paramsOrTicketNumber : paramsOrTicketNumber.ticketNumber;
    const customerId =
      typeof paramsOrTicketNumber === "string" ? maybeCustomerId! : paramsOrTicketNumber.customerId;
    const closeReason =
      typeof paramsOrTicketNumber === "string" ? maybeReason : paramsOrTicketNumber.reason;

    const ticket = await SupportTicketModel.findOne({
      ticketNumber,
      customerId,
    });

    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    if (!canCustomerClose(ticket.status as SupportTicketStatus)) {
      throw new ValidationError(`Ticket is already ${ticket.status}.`);
    }

    assertValidTicketTransition(ticket.status as SupportTicketStatus, SupportTicketStatus.CLOSED);

    const now = new Date();
    ticket.status = SupportTicketStatus.CLOSED;
    ticket.closedAt = now;
    ticket.resolvedAt = ticket.resolvedAt || now;
    await ticket.save();

    await AuditLogModel.create({
      actor: { id: customerId, type: "CUSTOMER" },
      action: "SUPPORT_TICKET_CLOSED_BY_CUSTOMER",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: { ticketNumber, reason: closeReason },
    }).catch(() => null);

    const updated = await this.getCustomerTicketDetail(ticketNumber, customerId);
    if (!updated) throw new Error("Failed to load closed ticket");
    return updated;
  }

  /**
   * Customer reopens a previously resolved or closed ticket.
   */
  async customerReopenTicket(
    paramsOrTicketNumber:
      | string
      | {
          customerId: string;
          ticketNumber: string;
          reason?: string;
        },
    maybeCustomerId?: string,
    maybeReason?: string
  ): Promise<CustomerSupportTicketDetailDTO> {
    const ticketNumber =
      typeof paramsOrTicketNumber === "string" ? paramsOrTicketNumber : paramsOrTicketNumber.ticketNumber;
    const customerId =
      typeof paramsOrTicketNumber === "string" ? maybeCustomerId! : paramsOrTicketNumber.customerId;
    const reason =
      typeof paramsOrTicketNumber === "string" ? maybeReason : paramsOrTicketNumber.reason;

    const ticket = await SupportTicketModel.findOne({
      ticketNumber,
      customerId,
    });

    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    if (!canCustomerReopen(ticket.status as SupportTicketStatus, ticket.closedAt)) {
      throw new ValidationError(
        "Ticket cannot be reopened. The reopening policy window (14 days) has elapsed or ticket is already open."
      );
    }

    assertValidTicketTransition(ticket.status as SupportTicketStatus, SupportTicketStatus.REOPENED);

    const now = new Date();
    ticket.status = SupportTicketStatus.REOPENED;
    ticket.reopenedAt = now;
    ticket.lastMessageAt = now;
    await ticket.save();

    // Create system / customer reopen message
    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderType: SupportSenderType.CUSTOMER,
      senderId: customerId,
      senderDisplayName: "Client",
      messageType: SupportMessageType.SYSTEM_EVENT,
      body: reason ? `Ticket reopened by client: ${reason}` : "Ticket reopened by client.",
      attachments: [],
      isInternal: false,
    });

    await AuditLogModel.create({
      actor: { id: customerId, type: "CUSTOMER" },
      action: "SUPPORT_TICKET_REOPENED",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: { ticketNumber, reason },
    }).catch(() => null);

    const updated = await this.getCustomerTicketDetail(ticketNumber, customerId);
    if (!updated) throw new Error("Failed to load reopened ticket");
    return updated;
  }

  /**
   * Convenience wrapper for staff agent reply with object params.
   */
  async addAgentReply(params: {
    agentId: string;
    agentEmail?: string;
    ticketNumber: string;
    input: AgentReplyInput;
    idempotencyKey?: string;
  }): Promise<AdminSupportTicketDetailDTO> {
    return this.agentReply(
      params.ticketNumber,
      { id: params.agentId, email: params.agentEmail },
      {
        ...params.input,
        idempotencyKey: params.idempotencyKey || params.input.idempotencyKey,
      }
    );
  }

  /**
   * Agent replies to customer conversation.
   */
  async agentReply(
    ticketNumber: string,
    staff: { id: string; name?: string; email?: string },
    rawInput: AgentReplyInput
  ): Promise<AdminSupportTicketDetailDTO> {
    const input = AgentReplySchema.parse(rawInput);

    const ticket = await SupportTicketModel.findOne({ ticketNumber });
    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new ValidationError("Cannot reply to a closed ticket. Please reopen it first.");
    }

    if (input.attachments && input.attachments.length > 0) {
      supportAttachmentService.validateAttachments(input.attachments);
    }

    const now = new Date();
    const isFirstResponse = !ticket.firstResponseAt;

    if (isFirstResponse) {
      ticket.firstResponseAt = now;
    }

    // Persist agent message
    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderType: SupportSenderType.SUPPORT_AGENT,
      senderId: staff.id,
      senderDisplayName: staff.name || "VÉRONA Concierge",
      messageType: SupportMessageType.MESSAGE,
      body: input.message,
      message: input.message,
      attachments: input.attachments || [],
      isInternal: false,
      idempotencyKey: input.idempotencyKey || null,
    });

    // Auto assign to replying agent if currently unassigned
    if (!ticket.assignedTo) {
      ticket.assignedTo = staff.id as unknown as any;
      ticket.assignedStaffId = staff.id as unknown as any;
    }

    // Update status to WAITING_FOR_CUSTOMER if in progress or open
    if (
      ticket.status === SupportTicketStatus.OPEN ||
      ticket.status === SupportTicketStatus.IN_PROGRESS ||
      ticket.status === SupportTicketStatus.REOPENED
    ) {
      ticket.status = SupportTicketStatus.WAITING_FOR_CUSTOMER;
    }

    ticket.lastMessageAt = now;
    await ticket.save();

    // Audit log
    await AuditLogModel.create({
      actor: { id: staff.id, email: staff.email, type: "STAFF" },
      action: "SUPPORT_AGENT_REPLIED",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: { ticketNumber, isFirstResponse },
    }).catch(() => null);

    // Emit Domain Event for Phase 25 notifications
    await supportEventService.emitEvent({
      eventId: `evt_${Date.now()}_agent_reply_${ticket._id}`,
      eventType: "support.agent_replied",
      ticketId: ticket._id.toString(),
      ticketNumber,
      customerId: ticket.customerId.toString(),
      agentId: staff.id,
      occurredAt: now,
    });

    const updated = await this.getAdminTicketDetail(ticketNumber);
    if (!updated) throw new Error("Failed to load updated admin ticket detail");
    return updated;
  }

  /**
   * Adds an internal staff note (strictly hidden from customer view).
   */
  async addInternalNote(
    paramsOrTicketNumber:
      | string
      | {
          agentId: string;
          agentEmail?: string;
          ticketNumber: string;
          input: InternalNoteInput;
          idempotencyKey?: string;
        },
    maybeStaff?: { id: string; name?: string; email?: string },
    maybeInput?: InternalNoteInput
  ): Promise<AdminSupportTicketDetailDTO> {
    const ticketNumber =
      typeof paramsOrTicketNumber === "string" ? paramsOrTicketNumber : paramsOrTicketNumber.ticketNumber;
    const staff =
      typeof paramsOrTicketNumber === "string"
        ? maybeStaff!
        : { id: paramsOrTicketNumber.agentId, email: paramsOrTicketNumber.agentEmail };
    const rawInput =
      typeof paramsOrTicketNumber === "string" ? maybeInput! : paramsOrTicketNumber.input;

    const input = InternalNoteSchema.parse(rawInput);

    const ticket = await SupportTicketModel.findOne({ ticketNumber });
    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    if (input.attachments && input.attachments.length > 0) {
      supportAttachmentService.validateAttachments(input.attachments);
    }

    await SupportMessageModel.create({
      ticketId: ticket._id,
      senderType: SupportSenderType.STAFF,
      senderId: staff.id,
      senderDisplayName: staff.name ? `${staff.name} (Internal)` : "Staff Note",
      messageType: SupportMessageType.INTERNAL_NOTE,
      body: input.note,
      message: input.note,
      attachments: input.attachments || [],
      isInternal: true, // Critical security guard
    });

    await AuditLogModel.create({
      actor: { id: staff.id, email: staff.email, type: "STAFF" },
      action: "SUPPORT_INTERNAL_NOTE_ADDED",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: { ticketNumber },
    }).catch(() => null);

    const updated = await this.getAdminTicketDetail(ticketNumber);
    if (!updated) throw new Error("Failed to load updated admin ticket detail");
    return updated;
  }

  /**
   * Assigns or reassigns a ticket to a staff agent or team queue.
   */
  async assignTicket(
    paramsOrTicketNumber:
      | string
      | {
          actorId: string;
          actorEmail?: string;
          ticketNumber: string;
          input: AssignTicketInput;
        },
    maybeStaff?: { id: string; email?: string },
    maybeInput?: AssignTicketInput
  ): Promise<AdminSupportTicketDetailDTO> {
    const ticketNumber =
      typeof paramsOrTicketNumber === "string" ? paramsOrTicketNumber : paramsOrTicketNumber.ticketNumber;
    const staffActor =
      typeof paramsOrTicketNumber === "string"
        ? maybeStaff!
        : { id: paramsOrTicketNumber.actorId, email: paramsOrTicketNumber.actorEmail };
    const rawInput =
      typeof paramsOrTicketNumber === "string" ? maybeInput! : paramsOrTicketNumber.input;

    const input = AssignTicketSchema.parse(rawInput);

    const ticket = await SupportTicketModel.findOne({ ticketNumber });
    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    let staffName = "Unassigned";
    if (input.assignedTo) {
      const assignedStaff = await StaffModel.findById(input.assignedTo).select("firstName lastName email").lean();
      if (!assignedStaff) {
        throw new NotFoundError("Target staff agent does not exist.");
      }
      staffName = [assignedStaff.firstName, assignedStaff.lastName].filter(Boolean).join(" ") || "Staff Member";
    }

    const previousAssignedTo = ticket.assignedTo?.toString();
    ticket.assignedTo = (input.assignedTo ? input.assignedTo : null) as unknown as any;
    ticket.assignedStaffId = (input.assignedTo ? input.assignedTo : null) as unknown as any;
    if (input.assignedTeam !== undefined) {
      ticket.assignedTeam = input.assignedTeam || undefined;
    }
    await ticket.save();

    await AuditLogModel.create({
      actor: { id: staffActor.id, email: staffActor.email, type: "STAFF" },
      action: "SUPPORT_TICKET_ASSIGNED",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: {
        ticketNumber,
        previousAssignedTo,
        newAssignedTo: input.assignedTo,
        assignedTeam: input.assignedTeam,
      },
    }).catch(() => null);

    const updated = await this.getAdminTicketDetail(ticketNumber);
    if (!updated) throw new Error("Failed to load updated ticket");
    return updated;
  }

  /**
   * Updates ticket status through the state machine.
   */
  /**
   * Updates ticket status through the state machine.
   */
  async updateTicketStatus(
    paramsOrTicketNumber:
      | string
      | {
          actorId: string;
          actorEmail?: string;
          ticketNumber: string;
          input: UpdateStatusInput;
        },
    maybeStaff?: { id: string; email?: string },
    maybeInput?: UpdateStatusInput
  ): Promise<AdminSupportTicketDetailDTO> {
    const ticketNumber =
      typeof paramsOrTicketNumber === "string" ? paramsOrTicketNumber : paramsOrTicketNumber.ticketNumber;
    const staffActor =
      typeof paramsOrTicketNumber === "string"
        ? maybeStaff!
        : { id: paramsOrTicketNumber.actorId, email: paramsOrTicketNumber.actorEmail };
    const rawInput =
      typeof paramsOrTicketNumber === "string" ? maybeInput! : paramsOrTicketNumber.input;

    const input = UpdateStatusSchema.parse(rawInput);

    const ticket = await SupportTicketModel.findOne({ ticketNumber });
    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    const currentStatus = ticket.status as SupportTicketStatus;
    const targetStatus = input.status;

    assertValidTicketTransition(currentStatus, targetStatus);

    const now = new Date();
    ticket.status = targetStatus;

    if (targetStatus === SupportTicketStatus.RESOLVED && !ticket.resolvedAt) {
      ticket.resolvedAt = now;
    }
    if (targetStatus === SupportTicketStatus.CLOSED) {
      ticket.closedAt = now;
      ticket.resolvedAt = ticket.resolvedAt || now;
    }
    if (targetStatus === SupportTicketStatus.REOPENED) {
      ticket.reopenedAt = now;
    }

    await ticket.save();

    // Audit log
    await AuditLogModel.create({
      actor: { id: staffActor.id, email: staffActor.email, type: "STAFF" },
      action: "SUPPORT_TICKET_STATUS_CHANGED",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: {
        ticketNumber,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        reason: input.reason,
      },
    }).catch(() => null);

    // If resolved, emit Domain Event
    if (targetStatus === SupportTicketStatus.RESOLVED) {
      await supportEventService.emitEvent({
        eventId: `evt_${Date.now()}_resolved_${ticket._id}`,
        eventType: "support.ticket_resolved",
        ticketId: ticket._id.toString(),
        ticketNumber,
        customerId: ticket.customerId.toString(),
        occurredAt: now,
      });
    }

    const updated = await this.getAdminTicketDetail(ticketNumber);
    if (!updated) throw new Error("Failed to load updated ticket");
    return updated;
  }

  /**
   * Updates ticket priority and recalculates SLA deadlines.
   */
  async updateTicketPriority(
    paramsOrTicketNumber:
      | string
      | {
          actorId: string;
          actorEmail?: string;
          ticketNumber: string;
          input: UpdatePriorityInput;
        },
    maybeStaff?: { id: string; email?: string },
    maybeInput?: UpdatePriorityInput
  ): Promise<AdminSupportTicketDetailDTO> {
    const ticketNumber =
      typeof paramsOrTicketNumber === "string" ? paramsOrTicketNumber : paramsOrTicketNumber.ticketNumber;
    const staffActor =
      typeof paramsOrTicketNumber === "string"
        ? maybeStaff!
        : { id: paramsOrTicketNumber.actorId, email: paramsOrTicketNumber.actorEmail };
    const rawInput =
      typeof paramsOrTicketNumber === "string" ? maybeInput! : paramsOrTicketNumber.input;

    const input = UpdatePrioritySchema.parse(rawInput);

    const ticket = await SupportTicketModel.findOne({ ticketNumber });
    if (!ticket) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }

    const oldPriority = ticket.priority;
    ticket.priority = input.priority;

    // Recalculate SLA deadlines with new priority
    const { firstResponseDeadline, resolutionDeadline } = slaService.calculateDeadlines(
      ticket.createdAt,
      input.priority
    );
    ticket.slaFirstResponseDeadline = firstResponseDeadline;
    ticket.slaResolutionDeadline = resolutionDeadline;

    await ticket.save();

    await AuditLogModel.create({
      actor: { id: staffActor.id, email: staffActor.email, type: "STAFF" },
      action: "SUPPORT_TICKET_PRIORITY_CHANGED",
      entity: "SupportTicket",
      entityId: ticket._id.toString(),
      metadata: {
        ticketNumber,
        oldPriority,
        newPriority: input.priority,
        reason: input.reason,
      },
    }).catch(() => null);

    const updated = await this.getAdminTicketDetail(ticketNumber);
    if (!updated) throw new Error("Failed to load updated ticket");
    return updated;
  }


  /**
   * Customer query: Get ticket detail.
   */
  async getCustomerTicket(
    customerId: string,
    ticketNumber: string
  ): Promise<CustomerSupportTicketDetailDTO> {
    const detail = await this.getCustomerTicketDetail(ticketNumber, customerId);
    if (!detail) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }
    return detail;
  }

  /**
   * Admin query: Search and list tickets with pagination and filtering.
   */
  async getAdminTickets(filter: SupportTicketFilter): Promise<PaginatedResult<AdminSupportTicketDTO>> {
    return supportRepository.listAdminTickets(filter);
  }

  /**
   * Admin query: Get single ticket detail.
   */
  async getAdminTicket(ticketNumber: string): Promise<AdminSupportTicketDetailDTO> {
    const detail = await this.getAdminTicketDetail(ticketNumber);
    if (!detail) {
      throw new NotFoundError(`Support ticket #${ticketNumber} not found.`);
    }
    return detail;
  }

  /**
   * Admin query: Get ticket detail with full conversation, internal notes, context, and SLA.
   */
  async getAdminTicketDetail(ticketNumber: string): Promise<AdminSupportTicketDetailDTO | null> {
    const result = await supportRepository.getAdminTicketByNumber(ticketNumber);
    if (!result) return null;

    const { ticket, messages } = result;

    const [customer, staff, context] = await Promise.all([
      CustomerModel.findById(ticket.customerId).select("firstName lastName email").lean(),
      ticket.assignedTo ? StaffModel.findById(ticket.assignedTo).select("firstName lastName email").lean() : null,
      supportContextService.loadTicketContext(ticket),
    ]);

    const customerName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ")
      : undefined;

    const sla = slaService.evaluateSlaState({
      createdAt: ticket.createdAt,
      firstResponseAt: ticket.firstResponseAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      slaFirstResponseDeadline: ticket.slaFirstResponseDeadline,
      slaResolutionDeadline: ticket.slaResolutionDeadline,
    });

    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      customerId: ticket.customerId.toString(),
      customerName: customerName || undefined,
      customerEmail: customer?.email,
      subject: ticket.subject,
      category: ticket.category as SupportCategory,
      priority: ticket.priority as SupportTicketPriority,
      status: ticket.status as SupportTicketStatus,
      assignedTo: staff
        ? {
            id: staff._id.toString(),
            name: [staff.firstName, staff.lastName].filter(Boolean).join(" ") || "Staff Member",
            email: staff.email,
          }
        : undefined,
      assignedTeam: ticket.assignedTeam || undefined,
      orderNumber: context.order?.orderNumber,
      sla,
      messages,
      context,
      lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : ticket.createdAt.toISOString(),
      firstResponseAt: ticket.firstResponseAt ? ticket.firstResponseAt.toISOString() : undefined,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : undefined,
      closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : undefined,
      reopenedAt: ticket.reopenedAt ? ticket.reopenedAt.toISOString() : undefined,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  /**
   * Fetches real-time queue and SLA stats for staff dashboard.
   */
  async getStats(): Promise<AdminSupportStatsDTO> {
    return supportRepository.getStats();
  }

  /**
   * Alias for getStats().
   */
  async getAdminStats(): Promise<AdminSupportStatsDTO> {
    return this.getStats();
  }
}

export const supportService = new SupportService();
