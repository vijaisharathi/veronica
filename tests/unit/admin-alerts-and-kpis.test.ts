/**
 * VÉRONA — Admin Alerts & Operational Severity Tests (Phase 27)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminAlertService } from "@/modules/admin/services/admin-alert.service";
import { PERMISSIONS } from "@/constants/permissions";

vi.mock("@/db/models", () => ({
  SupportTicketModel: {
    countDocuments: vi.fn().mockResolvedValue(3),
  },
  RefundModel: {
    countDocuments: vi.fn().mockResolvedValue(2),
  },
  PaymentModel: {
    countDocuments: vi.fn().mockResolvedValue(4),
  },
  ShipmentModel: {
    countDocuments: vi.fn().mockResolvedValue(1),
  },
  OrderModel: {
    countDocuments: vi.fn().mockResolvedValue(5),
  },
  ProductVariantModel: {
    countDocuments: vi.fn().mockResolvedValue(6),
  },
  NotificationDeliveryAttemptModel: {
    countDocuments: vi.fn().mockResolvedValue(2),
  },
  ProductReviewModel: {
    countDocuments: vi.fn().mockResolvedValue(8),
  },
}));

describe("Phase 27 — Operational Alerts Evaluation Tests", () => {
  const alertService = new AdminAlertService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates and prioritizes CRITICAL alerts above WARNING and INFO alerts", async () => {
    const allPermissions = [
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.REFUNDS_READ,
      PERMISSIONS.PAYMENTS_READ,
      PERMISSIONS.SHIPMENTS_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.NOTIFICATIONS_READ,
      PERMISSIONS.REVIEWS_READ,
    ];

    const alerts = await alertService.evaluateAlerts(allPermissions);

    expect(alerts.length).toBeGreaterThan(0);

    // Verify first alert has severity CRITICAL
    expect(alerts[0]?.severity).toBe("CRITICAL");

    // Verify ordering: all CRITICAL before WARNING, all WARNING before INFO
    const severities = alerts.map((a) => a.severity);
    const criticalIndices = severities.map((s, idx) => (s === "CRITICAL" ? idx : -1)).filter((i) => i >= 0);
    const warningIndices = severities.map((s, idx) => (s === "WARNING" ? idx : -1)).filter((i) => i >= 0);
    const infoIndices = severities.map((s, idx) => (s === "INFO" ? idx : -1)).filter((i) => i >= 0);

    if (criticalIndices.length > 0 && warningIndices.length > 0) {
      expect(Math.max(...criticalIndices)).toBeLessThan(Math.min(...warningIndices));
    }
    if (warningIndices.length > 0 && infoIndices.length > 0) {
      expect(Math.max(...warningIndices)).toBeLessThan(Math.min(...infoIndices));
    }
  });

  it("suppresses alerts for domains where staff lacks permissions", async () => {
    const restrictedPermissions = [
      PERMISSIONS.INVENTORY_READ,
      // No SUPPORT_READ, No REFUNDS_READ, No PAYMENTS_READ
    ];

    const alerts = await alertService.evaluateAlerts(restrictedPermissions);

    const supportAlert = alerts.find((a) => a.type === "SUPPORT_SLA_BREACH");
    const refundAlert = alerts.find((a) => a.type === "REFUND_FAILURE");
    const paymentAlert = alerts.find((a) => a.type === "PAYMENT_RECONCILIATION_REQUIRED");

    expect(supportAlert).toBeUndefined();
    expect(refundAlert).toBeUndefined();
    expect(paymentAlert).toBeUndefined();

    const inventoryAlert = alerts.find((a) => a.type === "CRITICAL_INVENTORY_SHORTAGE");
    expect(inventoryAlert).toBeDefined();
    expect(inventoryAlert?.href).toBe("/admin/inventory?filter=out-of-stock");
  });

  it("correctly includes drill-down navigation href on generated alerts", async () => {
    const permissions = [PERMISSIONS.SUPPORT_READ, PERMISSIONS.REFUNDS_READ];
    const alerts = await alertService.evaluateAlerts(permissions);

    const supportAlert = alerts.find((a) => a.type === "SUPPORT_SLA_BREACH");
    const refundAlert = alerts.find((a) => a.type === "REFUND_FAILURE");

    expect(supportAlert?.href).toBe("/admin/support?priority=URGENT");
    expect(refundAlert?.href).toBe("/admin/refunds?status=FAILED");
  });
});
