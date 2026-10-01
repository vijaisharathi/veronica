import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createOrder, GET as getCustomerOrders } from "@/app/api/orders/route";
import { GET as getOrderDetail } from "@/app/api/orders/[orderNumber]/route";
import { POST as cancelOrder } from "@/app/api/orders/[orderNumber]/cancel/route";
import * as authModule from "@/lib/auth/session";
import { orderService } from "@/modules/orders";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { OrderStatus } from "@/constants/status";
import { ICustomer } from "@/types/database";

describe("Phase 19 — Orders API Integration Tests", () => {
  const customerId = "507f1f77bcf86cd799439011";
  const orderNumber = "VRN-2026-F98B12";
  const paymentId = "507f1f77bcf86cd799439066";

  const mockCustomer: ICustomer = {
    _id: customerId as any,
    authProviderId: "clerk_customer_aria",
    email: "aria.sharma@example.com",
    firstName: "Aria",
    lastName: "Sharma",
    displayName: "Aria Sharma",
    status: "ACTIVE" as any,
    emailVerified: true,
    phoneVerified: true,
    preferences: {} as any,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderDTO = {
    id: "507f1f77bcf86cd799439088",
    orderNumber,
    customerId,
    email: "aria.sharma@example.com",
    phone: "+91 98200 98200",
    items: [
      {
        productId: "prod-1",
        variantId: "var-1",
        sku: "VRN-GL-01-M",
        productName: "Silk Evening Gown",
        brandName: "VÉRONA Atelier",
        size: "M",
        color: "Midnight Blue",
        image: "/images/gown.jpg",
        quantity: 1,
        unitPriceMinor: 149900,
        discountMinor: 0,
        taxMinor: 0,
        finalPriceMinor: 149900,
      },
    ],
    pricing: {
      subtotalMinor: 149900,
      discountMinor: 0,
      couponDiscountMinor: 0,
      totalDiscountMinor: 0,
      shippingMinor: 0,
      taxMinor: 0,
      totalMinor: 149900,
      currency: "INR",
    },
    shippingAddress: {
      fullName: "Aria Sharma",
      phone: "+91 98200 98200",
      addressLine1: "12 Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400050",
    },
    billingAddress: {
      fullName: "Aria Sharma",
      phone: "+91 98200 98200",
      addressLine1: "12 Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400050",
    },
    paymentSummary: {
      paymentId,
      provider: "razorpay",
      providerOrderId: "order_rzp_123",
      providerPaymentId: "pay_rzp_456",
      paymentStatus: "CAPTURED" as any,
      paidAmountMinor: 149900,
      currency: "INR",
    },
    status: OrderStatus.CONFIRMED,
    timeline: [],
    canCancel: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/orders (Create Order from Payment)", () => {
    it("converts a verified payment into a confirmed order", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValue(mockCustomer);
      vi.spyOn(orderService, "createOrderFromPayment").mockResolvedValue(mockOrderDTO);

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });

      const response = await createOrder(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.orderNumber).toBe(orderNumber);
      expect(json.data.status).toBe(OrderStatus.CONFIRMED);
      expect(orderService.createOrderFromPayment).toHaveBeenCalledWith(customerId, {
        paymentId,
      });
    });

    it("rejects unauthenticated requests with 401", async () => {
      vi.spyOn(authModule, "requireCustomer").mockRejectedValue(
        new AuthenticationError("Authentication required")
      );

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });

      const response = await createOrder(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("AUTHENTICATION_REQUIRED");
    });
  });

  describe("GET /api/orders (Customer Order List)", () => {
    it("returns paginated orders for authenticated customer", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValue(mockCustomer);
      vi.spyOn(orderService, "getCustomerOrders").mockResolvedValue({
        items: [mockOrderDTO],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false,
      });

      const request = new NextRequest("http://localhost:3000/api/orders?page=1&limit=10");
      const response = await getCustomerOrders(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
      expect(json.data.items[0].orderNumber).toBe(orderNumber);
    });
  });

  describe("GET /api/orders/[orderNumber] (Customer Order Detail & Anti-IDOR)", () => {
    it("returns order detail for the order owner", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValue(mockCustomer);
      vi.spyOn(orderService, "getOrderByNumber").mockResolvedValue(mockOrderDTO);

      const request = new NextRequest(`http://localhost:3000/api/orders/${orderNumber}`);
      const response = await getOrderDetail(request, {
        params: Promise.resolve({ orderNumber }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.orderNumber).toBe(orderNumber);
    });

    it("returns 404 when order belongs to another customer (Anti-IDOR)", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValue(mockCustomer);
      vi.spyOn(orderService, "getOrderByNumber").mockRejectedValue(
        new NotFoundError("Order not found")
      );

      const request = new NextRequest(`http://localhost:3000/api/orders/${orderNumber}`);
      const response = await getOrderDetail(request, {
        params: Promise.resolve({ orderNumber }),
      });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("RESOURCE_NOT_FOUND");
    });
  });

  describe("POST /api/orders/[orderNumber]/cancel (Customer Order Cancellation)", () => {
    it("cancels an order when valid and in CONFIRMED status", async () => {
      vi.spyOn(authModule, "requireCustomer").mockResolvedValue(mockCustomer);
      vi.spyOn(orderService, "cancelOrder").mockResolvedValue({
        ...mockOrderDTO,
        status: OrderStatus.CANCELLED,
        canCancel: false,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/orders/${orderNumber}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "CUSTOMER_CHANGED_MIND",
            notes: "Changed fitting selection",
          }),
        }
      );

      const response = await cancelOrder(request, {
        params: Promise.resolve({ orderNumber }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
