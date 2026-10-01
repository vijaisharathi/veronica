/**
 * VÉRONA — Support Repository (Phase 26)
 *
 * Direct database access layer for Customer Support tickets and conversations.
 * Enforces customerId isolation, batch-loads relational previews, and prevents N+1 queries.
 */

import {
  SupportTicketModel,
  SupportMessageModel,
  CustomerModel,
  StaffModel,
  OrderModel,
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
  CustomerSupportMessageDTO,
  AdminSupportTicketDTO,
  AdminSupportMessageDTO,
  SupportTicketFilter,
  CustomerTicketFilter,
  AdminSupportStatsDTO,
} from "../types/support.types";
import { slaService } from "../services/sla.service";
import { ISupportTicket, ISupportMessage } from "@/types/database";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SupportRepository {
  // ── Customer Queries ─────────────────────────────────────────────────────────

  /**
   * Fetches paginated tickets for the authenticated customer (anti-IDOR guaranteed).
   */
  async listCustomerTickets(
    customerId: string,
    filter: CustomerTicketFilter = {}
  ): Promise<PaginatedResult<CustomerSupportTicketDTO>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(50, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { customerId };
    if (filter.status) query.status = filter.status;
    if (filter.category) query.category = filter.category;

    const [docs, total] = await Promise.all([
      SupportTicketModel.find(query)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicketModel.countDocuments(query),
    ]);

    // Batch load orderNumbers
    const orderIds = docs
      .map((d) => d.orderId || d.relatedOrderId)
      .filter((id): id is string => Boolean(id));

    const orders = orderIds.length > 0
      ? await OrderModel.find({ _id: { $in: orderIds } }).select("orderNumber").lean()
      : [];
    const orderMap = new Map(orders.map((o) => [o._id.toString(), o.orderNumber]));

    const items: CustomerSupportTicketDTO[] = docs.map((doc) => {
      const orderId = doc.orderId || doc.relatedOrderId;
      const orderNumber = orderId ? orderMap.get(orderId.toString()) : undefined;

      return {
        ticketNumber: doc.ticketNumber,
        subject: doc.subject,
        category: doc.category as SupportCategory,
        priority: doc.priority as SupportTicketPriority,
        status: doc.status as SupportTicketStatus,
        hasOrderContext: Boolean(orderId),
        orderNumber,
        lastMessageAt: doc.lastMessageAt ? doc.lastMessageAt.toISOString() : doc.createdAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves a single customer ticket and its visible messages.
   * Internal notes are strictly excluded server-side.
   */
  async getCustomerTicketByNumber(
    ticketNumber: string,
    customerId: string
  ): Promise<{ ticket: ISupportTicket; messages: CustomerSupportMessageDTO[] } | null> {
    const ticket = await SupportTicketModel.findOne({
      ticketNumber,
      customerId, // Strict customer ownership guard
    }).lean();

    if (!ticket) return null;

    // Load only public (non-internal) messages
    const messageDocs = await SupportMessageModel.find({
      ticketId: ticket._id,
      isInternal: false, // Critical security guard
    })
      .sort({ createdAt: 1 })
      .lean();

    const messages: CustomerSupportMessageDTO[] = messageDocs.map((m) => ({
      id: m._id.toString(),
      senderType: m.senderType as SupportSenderType,
      senderDisplayName: m.senderDisplayName || (m.senderType === SupportSenderType.CUSTOMER ? "You" : "VÉRONA Concierge"),
      body: m.body || m.message || "",
      attachments: (m.attachments || []).map((a) => ({
        name: a.name,
        url: a.url,
        fileType: a.fileType,
        fileSize: a.fileSize,
        uploadedAt: a.uploadedAt ? a.uploadedAt.toISOString() : new Date().toISOString(),
      })),
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      ticket: ticket as unknown as ISupportTicket,
      messages,
    };
  }

  // ── Admin Queries ────────────────────────────────────────────────────────────

  /**
   * Admin query: Search and filter across all tickets with batch projections.
   */
  async listAdminTickets(filter: SupportTicketFilter): Promise<PaginatedResult<AdminSupportTicketDTO>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 25));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.queue) {
      if (filter.queue === "UNASSIGNED") {
        query.assignedTo = null;
      } else if (filter.queue === "URGENT") {
        query.priority = SupportTicketPriority.URGENT;
      } else if (filter.queue === "WAITING_FOR_CUSTOMER") {
        query.status = SupportTicketStatus.WAITING_FOR_CUSTOMER;
      } else if (filter.queue === "OPEN") {
        query.status = SupportTicketStatus.OPEN;
      } else if (filter.queue === "RESOLVED") {
        query.status = SupportTicketStatus.RESOLVED;
      } else if (filter.queue === "CLOSED") {
        query.status = SupportTicketStatus.CLOSED;
      } else if (filter.queue === "MY_TICKETS" && filter.assignedTo) {
        query.assignedTo = filter.assignedTo;
      }
    }

    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.category) query.category = filter.category;
    if (filter.customerId) query.customerId = filter.customerId;
    if (filter.orderId) query.orderId = filter.orderId;

    if (filter.assignedTo === "UNASSIGNED") {
      query.assignedTo = null;
    } else if (filter.assignedTo && filter.queue !== "UNASSIGNED") {
      query.assignedTo = filter.assignedTo;
    }

    if (filter.assignedTeam) {
      query.assignedTeam = filter.assignedTeam;
    }

    if (filter.search) {
      query.$or = [
        { ticketNumber: { $regex: filter.search, $options: "i" } },
        { subject: { $regex: filter.search, $options: "i" } },
      ];
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        (query.createdAt as Record<string, unknown>).$gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        (query.createdAt as Record<string, unknown>).$lte = new Date(filter.endDate);
      }
    }

    const [docs, total] = await Promise.all([
      SupportTicketModel.find(query)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicketModel.countDocuments(query),
    ]);

    // Batch load Customers, Staff, and Orders to prevent N+1 queries
    const customerIds = [...new Set(docs.map((d) => d.customerId.toString()))];
    const staffIds = [
      ...new Set(
        docs.map((d) => d.assignedTo?.toString()).filter((id): id is string => Boolean(id))
      ),
    ];
    const orderIds = [
      ...new Set(
        docs.map((d) => (d.orderId || d.relatedOrderId)?.toString()).filter((id): id is string => Boolean(id))
      ),
    ];

    const [customers, staffList, orders] = await Promise.all([
      CustomerModel.find({ _id: { $in: customerIds } })
        .select("firstName lastName email")
        .lean(),
      staffIds.length > 0
        ? StaffModel.find({ _id: { $in: staffIds } })
            .select("firstName lastName email")
            .lean()
        : [],
      orderIds.length > 0
        ? OrderModel.find({ _id: { $in: orderIds } })
            .select("orderNumber")
            .lean()
        : [],
    ]);

    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
    const staffMap = new Map(staffList.map((s) => [s._id.toString(), s]));
    const orderMap = new Map(orders.map((o) => [o._id.toString(), o.orderNumber]));

    const items: AdminSupportTicketDTO[] = docs.map((doc) => {
      const c = customerMap.get(doc.customerId.toString());
      const customerName = c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : undefined;

      const staff = doc.assignedTo ? staffMap.get(doc.assignedTo.toString()) : undefined;
      const orderId = doc.orderId || doc.relatedOrderId;
      const orderNumber = orderId ? orderMap.get(orderId.toString()) : undefined;

      const sla = slaService.evaluateSlaState({
        createdAt: doc.createdAt,
        firstResponseAt: doc.firstResponseAt,
        resolvedAt: doc.resolvedAt,
        closedAt: doc.closedAt,
        slaFirstResponseDeadline: doc.slaFirstResponseDeadline,
        slaResolutionDeadline: doc.slaResolutionDeadline,
      });

      return {
        id: doc._id.toString(),
        ticketNumber: doc.ticketNumber,
        customerId: doc.customerId.toString(),
        customerName: customerName || undefined,
        customerEmail: c?.email,
        subject: doc.subject,
        category: doc.category as SupportCategory,
        priority: doc.priority as SupportTicketPriority,
        status: doc.status as SupportTicketStatus,
        assignedTo: staff
          ? {
              id: staff._id.toString(),
              name: [staff.firstName, staff.lastName].filter(Boolean).join(" ") || "Staff Member",
              email: staff.email,
            }
          : undefined,
        assignedTeam: doc.assignedTeam || undefined,
        orderNumber,
        sla,
        lastMessageAt: doc.lastMessageAt ? doc.lastMessageAt.toISOString() : doc.createdAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single ticket for admin inspection, including all messages and internal notes.
   */
  async getAdminTicketByNumber(
    ticketNumber: string
  ): Promise<{ ticket: ISupportTicket; messages: AdminSupportMessageDTO[] } | null> {
    const ticket = await SupportTicketModel.findOne({ ticketNumber }).lean();
    if (!ticket) return null;

    const messageDocs = await SupportMessageModel.find({
      ticketId: ticket._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    const messages: AdminSupportMessageDTO[] = messageDocs.map((m) => ({
      id: m._id.toString(),
      senderType: m.senderType as SupportSenderType,
      senderId: m.senderId,
      senderDisplayName: m.senderDisplayName || (m.senderType === SupportSenderType.CUSTOMER ? "Client" : "Staff"),
      messageType: m.messageType as SupportMessageType,
      body: m.body || m.message || "",
      attachments: (m.attachments || []).map((a) => ({
        name: a.name,
        url: a.url,
        fileType: a.fileType,
        fileSize: a.fileSize,
        uploadedAt: a.uploadedAt ? a.uploadedAt.toISOString() : new Date().toISOString(),
      })),
      isInternal: Boolean(m.isInternal),
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      ticket: ticket as unknown as ISupportTicket,
      messages,
    };
  }

  /**
   * Aggregates real-time ticket statistics for admin queue monitoring.
   */
  async getStats(): Promise<AdminSupportStatsDTO> {
    const now = new Date();

    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingCustomerTickets,
      resolvedTickets,
      closedTickets,
      unassignedTickets,
      urgentTickets,
      slaBreachedTickets,
    ] = await Promise.all([
      SupportTicketModel.countDocuments(),
      SupportTicketModel.countDocuments({ status: SupportTicketStatus.OPEN }),
      SupportTicketModel.countDocuments({ status: SupportTicketStatus.IN_PROGRESS }),
      SupportTicketModel.countDocuments({ status: SupportTicketStatus.WAITING_FOR_CUSTOMER }),
      SupportTicketModel.countDocuments({ status: SupportTicketStatus.RESOLVED }),
      SupportTicketModel.countDocuments({ status: SupportTicketStatus.CLOSED }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.REOPENED] },
        assignedTo: null,
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.REOPENED] },
        priority: SupportTicketPriority.URGENT,
      }),
      SupportTicketModel.countDocuments({
        status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.REOPENED] },
        $or: [
          { firstResponseAt: null, slaFirstResponseDeadline: { $lt: now } },
          { resolvedAt: null, slaResolutionDeadline: { $lt: now } },
        ],
      }),
    ]);

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingCustomerTickets,
      resolvedTickets,
      closedTickets,
      unassignedTickets,
      urgentTickets,
      slaBreachedTickets,
    };
  }
}

export const supportRepository = new SupportRepository();
