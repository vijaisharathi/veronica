/**
 * VÉRONA — Admin Global Search & Security Tests (Phase 27)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminSearchService } from "@/modules/admin/services/admin-search.service";
import { PERMISSIONS } from "@/constants/permissions";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/db/models", () => ({
  OrderModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          orderNumber: "ORD-2026-9901",
          status: "CONFIRMED",
          customer: { name: "Priya Patel", email: "priya@example.com" },
          createdAt: new Date("2026-09-28T10:00:00Z"),
        },
      ]),
    }),
  },
  ProductModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          name: "Silk Evening Gown",
          slug: "silk-evening-gown",
          categoryId: "cat_dresses",
        },
      ]),
    }),
  },
  ProductVariantModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          sku: "SKU-GOWN-SLK-BLK-M",
          title: "Black / M",
          inventory: { availableStock: 12 },
        },
      ]),
    }),
  },
  CustomerModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          firstName: "Priya",
          lastName: "Patel",
          email: "priya@example.com",
          status: "ACTIVE",
        },
      ]),
    }),
  },
  PaymentModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: "pay_rzp_secure_889",
          providerOrderId: "order_rzp_9901",
          providerPaymentId: "pay_rzp_captured_01",
          status: "CAPTURED",
          provider: "Razorpay",
          amount: 1499900,
          createdAt: new Date("2026-09-28T10:05:00Z"),
        },
      ]),
    }),
  },
  RefundModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
  ReturnRequestModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
  SupportTicketModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          ticketNumber: "SUP-2026-000101",
          subject: "Size exchange inquiry",
          status: "OPEN",
          priority: "HIGH",
          createdAt: new Date("2026-09-28T09:30:00Z"),
        },
      ]),
    }),
  },
  ProductReviewModel: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

describe("Phase 27 — Admin Search & Security Tests", () => {
  const searchService = new AdminSearchService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty results immediately for queries shorter than 2 characters", async () => {
    const results = await searchService.search("a", [PERMISSIONS.ORDERS_READ]);
    expect(results).toEqual([]);
  });

  it("returns orders, products, and support tickets when staff has corresponding permissions", async () => {
    const permissions = [
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.SUPPORT_READ,
    ];

    const results = await searchService.search("priya", permissions);

    expect(results.length).toBeGreaterThan(0);
    const orderResult = results.find((r) => r.type === "ORDER");
    const productResult = results.find((r) => r.type === "PRODUCT");
    const supportResult = results.find((r) => r.type === "TICKET");

    expect(orderResult).toBeDefined();
    expect(orderResult?.reference).toBe("ORD-2026-9901");
    expect(productResult).toBeDefined();
    expect(supportResult).toBeDefined();
  });

  it("strictly suppresses Payment and Customer results when caller lacks PAYMENTS_READ and CUSTOMERS_READ", async () => {
    const permissions = [
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.PRODUCTS_READ,
      // Intentionally omitting PERMISSIONS.PAYMENTS_READ and PERMISSIONS.CUSTOMERS_READ
    ];

    const results = await searchService.search("priya", permissions);

    const paymentResult = results.find((r) => r.type === "PAYMENT");
    const customerResult = results.find((r) => r.type === "CUSTOMER");

    expect(paymentResult).toBeUndefined();
    expect(customerResult).toBeUndefined();
  });

  it("returns payment results only when PAYMENTS_READ is granted", async () => {
    const permissions = [
      PERMISSIONS.PAYMENTS_READ,
    ];

    const results = await searchService.search("order_rzp", permissions);

    const paymentResult = results.find((r) => r.type === "PAYMENT");
    expect(paymentResult).toBeDefined();
    expect(paymentResult?.reference).toBe("order_rzp_9901");
    expect(paymentResult?.href).toContain("/admin/payments");
  });

  it("limits maximum returned search results to 25 items", async () => {
    const allPermissions = [
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.PAYMENTS_READ,
      PERMISSIONS.REFUNDS_READ,
      PERMISSIONS.RETURNS_READ,
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.REVIEWS_READ,
    ];

    const results = await searchService.search("test", allPermissions);
    expect(results.length).toBeLessThanOrEqual(25);
  });
});
