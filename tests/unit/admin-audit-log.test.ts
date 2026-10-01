/**
 * VÉRONA — Audit Log Administration Unit Tests (Phase 29)
 *
 * Verifies append-only immutability, query filtering, and audit trail capture.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditActorType } from "@/constants/status";
import { AuditLogSchema } from "@/db/schemas/audit-log.schema";
import {
  AdminAuditListQuerySchema,
  AdminAuditExportQuerySchema,
} from "@/modules/admin/validators/admin-audit.validation";
import { logAuditTrail } from "@/lib/audit";
import { AuditLogModel } from "@/db/models";

vi.mock("@/db/models", () => ({
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({ _id: "audit-123" }),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe("Phase 29 — Audit Log Immutability & Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces append-only immutability by disabling updatedAt in Mongoose schema", () => {
    // AuditLogSchema timestamps options
    const schemaOptions = (AuditLogSchema as any).options;
    expect(schemaOptions.timestamps).toEqual({ createdAt: true, updatedAt: false });
  });

  it("validates audit list query parameters with defaults", () => {
    const parsed = AdminAuditListQuerySchema.parse({
      actorType: AuditActorType.STAFF,
      action: "staff.role_changed",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(25);
    expect(parsed.actorType).toBe(AuditActorType.STAFF);
    expect(parsed.action).toBe("staff.role_changed");
    expect(parsed.sortBy).toBe("createdAt");
    expect(parsed.sortOrder).toBe("desc");
  });

  it("validates audit export query schema", () => {
    const parsed = AdminAuditExportQuerySchema.parse({
      format: "json",
      entityType: "Customer",
      action: "customer.suspended",
    });

    expect(parsed.format).toBe("json");
    expect(parsed.entityType).toBe("Customer");
    expect(parsed.action).toBe("customer.suspended");
  });

  it("records standardized audit trail entries with before/after state", async () => {
    await logAuditTrail({
      actorId: "staff-123",
      actorEmail: "admin@verona.com",
      action: "customer.suspended",
      entityType: "Customer",
      entityId: "cust-456",
      before: { status: "ACTIVE" },
      after: { status: "SUSPENDED" },
      metadata: { reason: "Terms violation" },
      ipAddress: "192.168.1.1",
    });

    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "staff-123",
        action: "customer.suspended",
        entityType: "Customer",
        entityId: "cust-456",
        before: { status: "ACTIVE" },
        after: { status: "SUSPENDED" },
        ipAddress: "192.168.1.1",
      })
    );
  });
});
