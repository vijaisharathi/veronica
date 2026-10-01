/**
 * VÉRONA — Admin Dashboard Service Unit Test Suite (Phase 27)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminDashboardService } from "@/modules/admin/services/admin-dashboard.service";
import { getDateRangeBounds } from "@/modules/admin/utils/date.utils";
import { PERMISSIONS } from "@/constants/permissions";
import { IStaff } from "@/types/database";

// Mock DB models
vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/db/models", () => ({
  OrderModel: {
    countDocuments: vi.fn().mockResolvedValue(15),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          orderNumber: "ORD-2026-1001",
          customer: { name: "Aarav Sharma" },
          totals: { grandTotalMinor: 1299900 },
          status: "CONFIRMED",
          createdAt: new Date("2026-09-28T08:00:00Z"),
        },
      ]),
    }),
  },
  PaymentModel: {
    countDocuments: vi.fn().mockResolvedValue(12),
    aggregate: vi.fn().mockResolvedValue([{ totalMinor: 4500000, total: 4500000 }]),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "pay_test_01",
          amount: 1299900,
          providerOrderId: "order_rzp_123",
          status: "CAPTURED",
          provider: "Razorpay",
          createdAt: new Date("2026-09-28T08:00:00Z"),
        },
      ]),
    }),
  },
  RefundModel: {
    countDocuments: vi.fn().mockResolvedValue(2),
    aggregate: vi.fn().mockResolvedValue([{ total: 150000 }]),
  },
  ReturnRequestModel: {
    countDocuments: vi.fn().mockResolvedValue(3),
  },
  ShipmentModel: {
    countDocuments: vi.fn().mockResolvedValue(8),
  },
  SupportTicketModel: {
    countDocuments: vi.fn().mockResolvedValue(5),
  },
  NotificationDeliveryAttemptModel: {
    countDocuments: vi.fn().mockResolvedValue(1),
  },
  ProductReviewModel: {
    countDocuments: vi.fn().mockResolvedValue(4),
    aggregate: vi.fn().mockResolvedValue([{ avgRating: 4.8 }]),
  },
  ProductVariantModel: {
    countDocuments: vi.fn().mockResolvedValue(10),
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
  WarehouseModel: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: "wh_chennai",
          name: "Chennai Central Hub",
          code: "WH-CHN-01",
          active: true,
          address: { city: "Chennai" },
        },
      ]),
    }),
  },
  InventoryItemModel: {
    aggregate: vi.fn().mockResolvedValue([{ onHand: 500, reserved: 40, available: 460 }]),
  },
}));

vi.mock("@/modules/admin/services/admin-alert.service", () => ({
  adminAlertService: {
    evaluateAlerts: vi.fn().mockResolvedValue([
      {
        id: "alert_support_urgent_sla",
        type: "SUPPORT_SLA_BREACH",
        severity: "CRITICAL",
        title: "Urgent Support Tickets",
        description: "Urgent tickets requiring action",
        resourceType: "SUPPORT",
        href: "/admin/support?priority=URGENT",
        createdAt: "2026-09-28T00:00:00.000Z",
      },
    ]),
  },
}));

describe("Phase 27 — Admin Dashboard Service Unit Tests", () => {
  const service = new AdminDashboardService();

  const mockSuperAdmin: IStaff = {
    _id: "staff_superadmin_01",
    email: "admin@verona.fashion",
    firstName: "Elena",
    lastName: "Rossi",
    status: "ACTIVE" as any,
    roles: ["role_superadmin"],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarehouseStaff: IStaff = {
    _id: "staff_warehouse_01",
    email: "warehouse@verona.fashion",
    firstName: "Vikram",
    lastName: "Singh",
    status: "ACTIVE" as any,
    roles: ["role_warehouse"],
    assignedWarehouseId: "wh_chennai",
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Date Range Calculations", () => {
    it("correctly computes TODAY bounds starting at 00:00:00", () => {
      const now = new Date("2026-09-28T14:30:00Z");
      const bounds = getDateRangeBounds("TODAY", now);

      expect(bounds.start.getHours()).toBe(0);
      expect(bounds.start.getMinutes()).toBe(0);
      expect(bounds.start.getSeconds()).toBe(0);
      expect(bounds.end.getTime()).toBe(now.getTime());
    });

    it("correctly computes YESTERDAY bounds covering the previous 24 hours", () => {
      const now = new Date("2026-09-28T14:30:00Z");
      const bounds = getDateRangeBounds("YESTERDAY", now);

      expect(bounds.start.getDate()).toBe(now.getDate() - 1);
      expect(bounds.start.getHours()).toBe(0);
      expect(bounds.end.getDate()).toBe(now.getDate() - 1);
      expect(bounds.end.getHours()).toBe(23);
      expect(bounds.end.getMinutes()).toBe(59);
    });

    it("correctly computes LAST_7_DAYS spanning 7 calendar days", () => {
      const now = new Date("2026-09-28T14:30:00Z");
      const bounds = getDateRangeBounds("LAST_7_DAYS", now);

      const diffDays = Math.floor((bounds.end.getTime() - bounds.start.getTime()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(7);
    });
  });

  describe("Permission-Gated Dashboard Aggregation", () => {
    it("returns all domain widgets and KPIs for Super Admin with full permissions", async () => {
      const allPermissions = [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.PAYMENTS_READ,
        PERMISSIONS.INVENTORY_READ,
        PERMISSIONS.WAREHOUSES_READ,
        PERMISSIONS.REFUNDS_READ,
        PERMISSIONS.RETURNS_READ,
        PERMISSIONS.REVIEWS_READ,
        PERMISSIONS.SUPPORT_READ,
        PERMISSIONS.NOTIFICATIONS_READ,
      ];

      const dashboard = await service.getDashboard(mockSuperAdmin, allPermissions, "TODAY");

      expect(dashboard).toBeDefined();
      expect(dashboard.orders).toBeDefined();
      expect(dashboard.payments).toBeDefined();
      expect(dashboard.inventory).toBeDefined();
      expect(dashboard.warehouses).toBeDefined();
      expect(dashboard.refunds).toBeDefined();
      expect(dashboard.returns).toBeDefined();
      expect(dashboard.support).toBeDefined();
      expect(dashboard.alerts.length).toBeGreaterThan(0);
      expect(dashboard.kpis.length).toBeGreaterThan(5);
    });

    it("omits financial, support, and review widgets for Warehouse Staff with restricted permissions", async () => {
      const warehousePermissions = [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.INVENTORY_READ,
        PERMISSIONS.WAREHOUSES_READ,
        PERMISSIONS.FULFILLMENT_READ,
      ];

      const dashboard = await service.getDashboard(mockWarehouseStaff, warehousePermissions, "TODAY");

      expect(dashboard.inventory).toBeDefined();
      expect(dashboard.warehouses).toBeDefined();
      expect(dashboard.payments).toBeUndefined();
      expect(dashboard.refunds).toBeUndefined();
      expect(dashboard.support).toBeUndefined();
      expect(dashboard.reviews).toBeUndefined();
      expect(dashboard.staff.assignedWarehouseId).toBe("wh_chennai");
    });
  });

  describe("Partial Failure Isolation", () => {
    it("captures widget error under partialFailures while allowing other widgets to load", async () => {
      // Mock fetchPaymentsSummary on service to throw an error
      const spy = vi.spyOn(service as any, "fetchPaymentsSummary").mockRejectedValueOnce(new Error("MongoDB connection timeout"));

      const permissions = [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.ORDERS_READ,
        PERMISSIONS.PAYMENTS_READ,
      ];

      const dashboard = await service.getDashboard(mockSuperAdmin, permissions, "TODAY");

      expect(dashboard.orders).toBeDefined();
      expect(dashboard.payments).toBeUndefined();
      expect(dashboard.partialFailures).toBeDefined();
      expect(dashboard.partialFailures?.some((pf) => pf.widget === "payments")).toBe(true);

      spy.mockRestore();
    });
  });
});
