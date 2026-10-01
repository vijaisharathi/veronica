/**
 * VÉRONA — Customer Administration Unit Tests (Phase 29)
 *
 * Validates customer listing, search parameters, lifecycle status transitions,
 * address scoping, and security invariants.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CustomerStatus } from "@/constants/status";
import {
  AdminCustomerListQuerySchema,
  AdminCustomerStatusUpdateSchema,
  AdminCustomerExportQuerySchema,
} from "@/modules/admin/validators/admin-customer.validation";

describe("Phase 29 — Admin Customer Validation & Lifecyle Constraints", () => {
  it("validates valid customer list query parameters with defaults", () => {
    const parsed = AdminCustomerListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.sortBy).toBe("createdAt");
    expect(parsed.sortOrder).toBe("desc");
  });

  it("accepts valid status and search filters", () => {
    const parsed = AdminCustomerListQuerySchema.parse({
      status: CustomerStatus.ACTIVE,
      search: "sophia@example.com",
      page: "2",
      limit: "50",
    });

    expect(parsed.status).toBe(CustomerStatus.ACTIVE);
    expect(parsed.search).toBe("sophia@example.com");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
  });

  it("validates customer suspension payload requiring reason", () => {
    const valid = AdminCustomerStatusUpdateSchema.safeParse({
      status: CustomerStatus.SUSPENDED,
      reason: "Suspected unauthorized account takeover",
    });
    expect(valid.success).toBe(true);

    const invalidShortReason = AdminCustomerStatusUpdateSchema.safeParse({
      status: CustomerStatus.SUSPENDED,
      reason: "ab", // Too short
    });
    expect(invalidShortReason.success).toBe(false);
  });

  it("validates customer restoration payload", () => {
    const valid = AdminCustomerStatusUpdateSchema.safeParse({
      status: CustomerStatus.ACTIVE,
      reason: "Client verified identity via concierge support",
    });
    expect(valid.success).toBe(true);
  });

  it("strictly rejects arbitrary unauthorized status mutations", () => {
    const invalid = AdminCustomerStatusUpdateSchema.safeParse({
      status: "DELETED", // Destructive deletion prohibited through status update
    });
    expect(invalid.success).toBe(false);

    const arbitrary = AdminCustomerStatusUpdateSchema.safeParse({
      status: "VIP_GOD_MODE",
    });
    expect(arbitrary.success).toBe(false);
  });

  it("validates customer export query parameters", () => {
    const parsed = AdminCustomerExportQuerySchema.parse({
      format: "json",
      status: CustomerStatus.ACTIVE,
    });
    expect(parsed.format).toBe("json");
    expect(parsed.status).toBe(CustomerStatus.ACTIVE);
  });
});
