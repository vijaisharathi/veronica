/**
 * VÉRONA — Staff Administration Unit Tests (Phase 29)
 *
 * Validates workforce input validation, role assignment schemas,
 * warehouse scope assignment, and status transition schemas.
 */

import { describe, it, expect } from "vitest";
import { StaffStatus } from "@/constants/status";
import {
  AdminStaffListQuerySchema,
  AdminStaffCreateSchema,
  AdminStaffUpdateSchema,
  AdminStaffStatusUpdateSchema,
  AdminStaffRoleUpdateSchema,
  AdminStaffScopeUpdateSchema,
} from "@/modules/admin/validators/admin-staff.validation";

describe("Phase 29 — Admin Staff Validation Schemas", () => {
  it("validates staff listing queries with default pagination and sorting", () => {
    const parsed = AdminStaffListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.sortBy).toBe("createdAt");
    expect(parsed.sortOrder).toBe("desc");
  });

  it("validates staff creation with valid parameters", () => {
    const valid = AdminStaffCreateSchema.safeParse({
      email: "elena.rostova@verona.com",
      firstName: "Elena",
      lastName: "Rostova",
      phone: "+91 98765 43210",
      roles: ["order-manager"],
      assignedWarehouseId: "WH-BLR-01",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects staff creation with missing required fields or invalid email", () => {
    const invalidEmail = AdminStaffCreateSchema.safeParse({
      email: "not-an-email",
      firstName: "Elena",
      lastName: "Rostova",
      roles: ["order-manager"],
    });
    expect(invalidEmail.success).toBe(false);

    const emptyRoles = AdminStaffCreateSchema.safeParse({
      email: "elena@verona.com",
      firstName: "Elena",
      lastName: "Rostova",
      roles: [], // Requires at least one role
    });
    expect(emptyRoles.success).toBe(false);
  });

  it("validates staff status transition with audit reason requirement", () => {
    const validSuspend = AdminStaffStatusUpdateSchema.safeParse({
      status: StaffStatus.SUSPENDED,
      reason: "Departing employee offboarding protocol",
    });
    expect(validSuspend.success).toBe(true);

    const invalidShortReason = AdminStaffStatusUpdateSchema.safeParse({
      status: StaffStatus.SUSPENDED,
      reason: "no", // Less than 3 chars
    });
    expect(invalidShortReason.success).toBe(false);
  });

  it("validates staff role update schema requiring at least one role", () => {
    const valid = AdminStaffRoleUpdateSchema.safeParse({
      roles: ["inventory-manager", "warehouse-staff"],
      reason: "Assigned additional fulfillment responsibilities",
    });
    expect(valid.success).toBe(true);

    const empty = AdminStaffRoleUpdateSchema.safeParse({
      roles: [],
    });
    expect(empty.success).toBe(false);
  });

  it("validates staff warehouse scope assignment", () => {
    const withWarehouse = AdminStaffScopeUpdateSchema.safeParse({
      assignedWarehouseId: "WH-MUM-01",
      reason: "Transferred to Mumbai fulfillment center",
    });
    expect(withWarehouse.success).toBe(true);

    const clearToGlobal = AdminStaffScopeUpdateSchema.safeParse({
      assignedWarehouseId: null,
      reason: "Promoted to regional inventory controller with global access",
    });
    expect(clearToGlobal.success).toBe(true);
  });
});
