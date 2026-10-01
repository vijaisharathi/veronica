import { describe, it, expect, vi, beforeEach } from "vitest";
import { supportService } from "@/modules/support/services/support.service";
import { supportEventService } from "@/modules/support/services/support-event.service";
import {
  SupportTicketModel,
  SupportMessageModel,
  CustomerModel,
  StaffModel,
  AuditLogModel,
} from "@/db/models";
import {
  SupportCategory,
  SupportPriority,
  SupportSenderType,
  SupportTicketStatus,
} from "@/constants/status";

describe("Phase 26 — Support Service Lifecycle, Idempotency & Concurrency", () => {
  const customerId = "507f1f77bcf86cd799439011";
  const staffId = "507f1f77bcf86cd799439022";
  const ticketNumber = "SUP-2026-TEST01";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Idempotency Controls", () => {
    it("returns existing ticket when createTicket is called with an already registered idempotencyKey", async () => {
      const idempotencyKey = "idem_create_ticket_12345";

      // 1. Mock existing ticket found with idempotencyKey
      vi.spyOn(SupportTicketModel, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439099",
          ticketNumber,
          customerId,
          idempotencyKey,
        }),
      } as any);

      // Mock getCustomerTicketDetail return
      const existingTicketDetail = {
        id: "507f1f77bcf86cd799439099",
        ticketNumber,
        subject: "Existing Inquired Matter",
        category: SupportCategory.ORDER,
        priority: SupportPriority.MEDIUM,
        status: SupportTicketStatus.OPEN,
        hasOrderContext: false,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        context: {},
        messages: [],
        canReply: true,
        canClose: true,
        canReopen: false,
      };

      vi.spyOn(supportService, "getCustomerTicketDetail").mockResolvedValue(existingTicketDetail as any);
      const createSpy = vi.spyOn(SupportTicketModel, "create");

      const result = await supportService.createTicket(customerId, {
        category: SupportCategory.ORDER,
        subject: "Duplicate attempt",
        message: "This should not create another ticket in DB",
        idempotencyKey,
      });

      expect(result.ticketNumber).toBe(ticketNumber);
      // Ensure SupportTicketModel.create was NOT called
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("First Response Timestamp Tracking", () => {
    it("stamps firstResponseAt on the first agent reply and preserves it on subsequent replies", async () => {
      const mockTicket = {
        _id: "507f1f77bcf86cd799439088",
        ticketNumber,
        customerId,
        status: SupportTicketStatus.OPEN,
        priority: SupportPriority.HIGH,
        firstResponseAt: null as Date | null,
        assignedTo: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(SupportTicketModel, "findOne").mockResolvedValue(mockTicket as any);
      vi.spyOn(SupportMessageModel, "create").mockResolvedValue({} as any);
      vi.spyOn(AuditLogModel, "create").mockResolvedValue({} as any);
      vi.spyOn(supportEventService, "emitEvent").mockResolvedValue({} as any);
      vi.spyOn(supportService, "getAdminTicketDetail").mockResolvedValue({
        ticketNumber,
        status: SupportTicketStatus.WAITING_FOR_CUSTOMER,
      } as any);

      // 1. First agent reply: firstResponseAt should be stamped
      await supportService.agentReply(
        ticketNumber,
        { id: staffId, name: "Atelier Specialist", email: "specialist@verona.com" },
        { message: "First concierge response to client" }
      );

      expect(mockTicket.firstResponseAt).toBeInstanceOf(Date);
      const originalFirstResponse = mockTicket.firstResponseAt;

      // 2. Second agent reply: firstResponseAt should NOT be overwritten
      await supportService.agentReply(
        ticketNumber,
        { id: staffId, name: "Atelier Specialist", email: "specialist@verona.com" },
        { message: "Follow up concierge note" }
      );

      expect(mockTicket.firstResponseAt).toBe(originalFirstResponse);
    });

    it("auto-assigns ticket to replying agent if ticket was unassigned", async () => {
      const mockTicket = {
        _id: "507f1f77bcf86cd799439088",
        ticketNumber,
        customerId,
        status: SupportTicketStatus.OPEN,
        priority: SupportPriority.MEDIUM,
        assignedTo: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(SupportTicketModel, "findOne").mockResolvedValue(mockTicket as any);
      vi.spyOn(SupportMessageModel, "create").mockResolvedValue({} as any);
      vi.spyOn(AuditLogModel, "create").mockResolvedValue({} as any);
      vi.spyOn(supportEventService, "emitEvent").mockResolvedValue({} as any);
      vi.spyOn(supportService, "getAdminTicketDetail").mockResolvedValue({} as any);

      await supportService.agentReply(
        ticketNumber,
        { id: staffId, name: "Atelier Specialist", email: "specialist@verona.com" },
        { message: "Greetings from the atelier" }
      );

      expect(mockTicket.assignedTo).toBe(staffId);
      expect(mockTicket.status).toBe(SupportTicketStatus.WAITING_FOR_CUSTOMER);
    });
  });

  describe("Status Transitions Triggered by Conversations", () => {
    it("transitions WAITING_FOR_CUSTOMER back to IN_PROGRESS upon customer reply", async () => {
      const mockTicket = {
        _id: "507f1f77bcf86cd799439088",
        ticketNumber,
        customerId,
        status: SupportTicketStatus.WAITING_FOR_CUSTOMER,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(SupportTicketModel, "findOne").mockResolvedValue(mockTicket as any);
      vi.spyOn(CustomerModel, "findById").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ firstName: "Clara", lastName: "Oswald" }),
        }),
      } as any);
      vi.spyOn(SupportMessageModel, "create").mockResolvedValue({} as any);
      vi.spyOn(supportEventService, "emitEvent").mockResolvedValue({} as any);
      vi.spyOn(supportService, "getCustomerTicketDetail").mockResolvedValue({} as any);

      await supportService.customerReply(ticketNumber, customerId, {
        message: "Here is the additional delivery clarification requested.",
      });

      expect(mockTicket.status).toBe(SupportTicketStatus.IN_PROGRESS);
    });
  });

  describe("Notification Boundary Event Emission", () => {
    it("emits domain events consumed by Phase 25 without implementing direct delivery in Phase 26", async () => {
      const emitSpy = vi.spyOn(supportEventService, "emitEvent").mockResolvedValue({} as any);

      const mockTicket = {
        _id: "507f1f77bcf86cd799439088",
        ticketNumber,
        customerId,
        status: SupportTicketStatus.IN_PROGRESS,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(SupportTicketModel, "findOne").mockResolvedValue(mockTicket as any);
      vi.spyOn(AuditLogModel, "create").mockResolvedValue({} as any);
      vi.spyOn(supportService, "getAdminTicketDetail").mockResolvedValue({} as any);

      // Staff resolves ticket
      await supportService.updateTicketStatus(ticketNumber, { id: staffId }, {
        status: SupportTicketStatus.RESOLVED,
        reason: "Issue resolved satisfactorily",
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "support.ticket_resolved",
          ticketNumber,
          customerId,
        })
      );
    });
  });
});
