import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "@/modules/orders/services/order.service";
import { OrderRepository } from "@/modules/orders/repositories/order.repository";
import { OrderStatus, PaymentStatus, CheckoutSessionStatus, CartStatus } from "@/constants/status";
import { AppError, NotFoundError, AuthorizationError, ValidationError } from "@/lib/errors";
import {
  PaymentModel,
  CheckoutSessionModel,
  CartModel,
  CartItemModel,
  CustomerModel,
} from "@/db/models";

vi.mock("@/db/models", () => ({
  OrderModel: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
  OrderStatusHistoryModel: {
    create: vi.fn(),
    find: vi.fn(),
  },
  PaymentModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    find: vi.fn(),
  },
  CheckoutSessionModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  CartModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  CartItemModel: {
    find: vi.fn(),
  },
  CustomerModel: {
    findById: vi.fn(),
  },
  StockReservationModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
  WarehouseModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
  InventoryItemModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
}));

describe("Phase 19 — Order Domain Service Unit Tests", () => {
  let mockRepo: OrderRepository;
  let service: OrderService;

  const customerId = "507f1f77bcf86cd799439011";
  const checkoutSessionId = "507f1f77bcf86cd799439055";
  const paymentId = "507f1f77bcf86cd799439066";
  const cartId = "507f1f77bcf86cd799439077";
  const orderId = "507f1f77bcf86cd799439088";
  const orderNumber = "VRN-2026-A1B2C3";

  const mockPayment = {
    _id: paymentId,
    customerId,
    checkoutSessionId,
    provider: "razorpay",
    providerOrderId: "order_rzp_123",
    providerPaymentId: "pay_rzp_456",
    amount: 149900,
    currency: "INR",
    status: PaymentStatus.CAPTURED,
  };

  const mockCheckout = {
    _id: checkoutSessionId,
    customerId,
    cartId,
    pricingSnapshot: {
      subtotalMinor: 149900,
      promotionDiscountMinor: 0,
      couponDiscountMinor: 0,
      totalDiscountMinor: 0,
      amountDueBeforePaymentMinor: 149900,
      currency: "INR",
    },
    addressSnapshot: {
      fullName: "Aria Sharma",
      phone: "+91 98200 98200",
      addressLine1: "12 Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400050",
    },
    appliedCouponCode: undefined,
  };

  const mockCustomer = {
    _id: customerId,
    email: "aria@example.com",
    phone: "+91 98200 98200",
    displayName: "Aria Sharma",
  };

  const mockCart = {
    _id: cartId,
    status: CartStatus.ACTIVE,
  };

  const mockCartItems = [
    {
      _id: "item-1",
      productId: "prod-1",
      variantId: "var-1",
      quantity: 1,
      unitPriceSnapshot: 149900,
      productNameSnapshot: "Silk Evening Gown",
      variantSnapshot: {
        sku: "VRN-GL-01-M",
        size: "M",
        color: "Midnight Blue",
      },
      imageSnapshot: "/images/gown.jpg",
    },
  ];

  const mockOrderRecord = {
    _id: orderId,
    orderNumber,
    customerId,
    checkoutSessionId,
    email: "aria@example.com",
    phone: "+91 98200 98200",
    items: [
      {
        _id: "item-1",
        productId: "prod-1",
        variantId: "var-1",
        sku: "VRN-GL-01-M",
        productName: "Silk Evening Gown",
        brandName: "VÉRONA Atelier",
        size: "M",
        color: "Midnight Blue",
        image: "/images/gown.jpg",
        quantity: 1,
        unitPrice: 149900,
        discount: 0,
        tax: 0,
        finalPrice: 149900,
      },
    ],
    pricing: {
      subtotal: 149900,
      discount: 0,
      couponDiscount: 0,
      totalDiscount: 0,
      shipping: 0,
      tax: 0,
      total: 149900,
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
    paymentId,
    paymentStatus: PaymentStatus.CAPTURED,
    status: OrderStatus.CONFIRMED,
    createdAt: new Date("2026-09-27T10:00:00Z"),
    updatedAt: new Date("2026-09-27T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      createOrder: vi.fn().mockResolvedValue(mockOrderRecord),
      findByOrderNumber: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(mockOrderRecord),
      findByPaymentId: vi.fn().mockResolvedValue(null),
      findByCheckoutSessionId: vi.fn().mockResolvedValue(null),
      findByCustomerId: vi.fn().mockResolvedValue({
        items: [mockOrderRecord],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false,
      }),
      findOrders: vi.fn().mockResolvedValue({
        items: [mockOrderRecord],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false,
      }),
      updateOrderStatus: vi.fn().mockResolvedValue({
        ...mockOrderRecord,
        status: OrderStatus.CANCELLED,
      }),
      recordStatusHistory: vi.fn().mockResolvedValue(undefined),
      recordStatusChange: vi.fn().mockResolvedValue(undefined),
      getStatusHistory: vi.fn().mockResolvedValue([
        {
          orderId,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          changedBy: "SYSTEM",
          reason: "Order confirmed",
          createdAt: new Date("2026-09-27T10:00:00Z"),
        },
      ]),
      findCapturedPaymentsWithoutOrder: vi.fn().mockResolvedValue([]),
      findOrdersWithPaymentMismatch: vi.fn().mockResolvedValue([]),
    } as unknown as OrderRepository;

    service = new OrderService(mockRepo);
  });

  describe("createOrderFromPayment", () => {
    it("converts a verified CAPTURED payment into an immutable order with complete snapshots", async () => {
      vi.mocked(PaymentModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockPayment),
      } as any);

      vi.mocked(CheckoutSessionModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCheckout),
      } as any);

      vi.mocked(CustomerModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCustomer),
      } as any);

      vi.mocked(CartModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCart),
      } as any);

      vi.mocked(CartItemModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCartItems),
      } as any);

      vi.mocked(PaymentModel.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(CheckoutSessionModel.findByIdAndUpdate).mockResolvedValue({} as any);
      vi.mocked(CartModel.findByIdAndUpdate).mockResolvedValue({} as any);

      const orderDTO = await service.createOrderFromPayment(customerId, { paymentId });

      expect(orderDTO).toBeDefined();
      expect(orderDTO.orderNumber).toBe(orderNumber);
      expect(orderDTO.status).toBe(OrderStatus.CONFIRMED);
      expect(orderDTO.pricing.totalMinor).toBe(149900);
      expect(orderDTO.items).toHaveLength(1);
      expect(orderDTO.items[0]!.sku).toBe("VRN-GL-01-M");
      expect(orderDTO.shippingAddress.pincode).toBe("400050");

      // Verify post-order updates: payment updated with orderId, checkout completed, cart converted
      expect(PaymentModel.findByIdAndUpdate).toHaveBeenCalledWith(paymentId, {
        $set: { orderId },
      });
      expect(CheckoutSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(checkoutSessionId, {
        $set: { status: CheckoutSessionStatus.COMPLETED },
      });
      expect(CartModel.findByIdAndUpdate).toHaveBeenCalledWith(cartId, {
        $set: { status: CartStatus.CONVERTED },
      });
    });

    it("idempotently returns the existing order if payment was already converted", async () => {
      vi.mocked(mockRepo.findByPaymentId).mockResolvedValue(mockOrderRecord as any);

      const result = await service.createOrderFromPayment(customerId, { paymentId });

      expect(result.id).toBe(orderId);
      expect(result.orderNumber).toBe(orderNumber);
      expect(mockRepo.createOrder).not.toHaveBeenCalled();
    });

    it("rejects order creation if payment is not in CAPTURED status", async () => {
      vi.mocked(PaymentModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ...mockPayment, status: PaymentStatus.PENDING }),
      } as any);

      await expect(
        service.createOrderFromPayment(customerId, { paymentId })
      ).rejects.toThrow(ValidationError);
    });

    it("rejects order creation if payment amount does not match checkout pricing", async () => {
      vi.mocked(PaymentModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ ...mockPayment, amount: 99900 }), // ₹999 instead of ₹1499
      } as any);

      vi.mocked(CheckoutSessionModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCheckout),
      } as any);

      await expect(
        service.createOrderFromPayment(customerId, { paymentId })
      ).rejects.toThrow(AppError);
    });

    it("rejects order creation if payment does not belong to customer", async () => {
      vi.mocked(PaymentModel.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockPayment),
      } as any);

      await expect(
        service.createOrderFromPayment("wrong-customer-id", { paymentId })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("getOrderByNumber (Anti-IDOR)", () => {
    it("returns order DTO when customer owns the order", async () => {
      vi.mocked(mockRepo.findByOrderNumber).mockResolvedValue(mockOrderRecord as any);

      const result = await service.getOrderByNumber(customerId, orderNumber);
      expect(result.orderNumber).toBe(orderNumber);
      expect(result.customerId).toBe(customerId);
    });

    it("throws 404 NotFoundError if order belongs to a different customer", async () => {
      vi.mocked(mockRepo.findByOrderNumber).mockResolvedValue(mockOrderRecord as any);

      await expect(
        service.getOrderByNumber("other-customer-id", orderNumber)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("cancelOrder", () => {
    it("successfully cancels an order in CONFIRMED status", async () => {
      vi.mocked(mockRepo.findByOrderNumber).mockResolvedValue(mockOrderRecord as any);

      const result = await service.cancelOrder(customerId, orderNumber, {
        reason: "CUSTOMER_CHANGED_MIND" as any,
        notes: "Found alternative silhouette",
      });

      expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.CANCELLED,
        expect.objectContaining({
          reason: "CUSTOMER_CHANGED_MIND",
          cancelledBy: customerId,
        })
      );
      expect(mockRepo.recordStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: OrderStatus.CANCELLED,
        })
      );
    });

    it("rejects cancellation if order is already in PROCESSING status", async () => {
      vi.mocked(mockRepo.findByOrderNumber).mockResolvedValue({
        ...mockOrderRecord,
        status: OrderStatus.PROCESSING,
      } as any);

      await expect(
        service.cancelOrder(customerId, orderNumber, {
          reason: "CUSTOMER_CHANGED_MIND" as any,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe("updateOrderStatusAsAdmin", () => {
    it("transitions status when valid and records audit history", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockOrderRecord as any);
      vi.mocked(mockRepo.updateOrderStatus).mockResolvedValue({
        ...mockOrderRecord,
        status: OrderStatus.PROCESSING,
      } as any);

      const updated = await service.updateOrderStatusAsAdmin(
        orderId,
        "staff@verona.com",
        OrderStatus.PROCESSING,
        "Inspection passed, handed to packaging"
      );

      expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(orderId, OrderStatus.PROCESSING);
      expect(mockRepo.recordStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: OrderStatus.PROCESSING,
          changedBy: "staff@verona.com",
        })
      );
    });

    it("rejects illegal transitions (e.g., CONFIRMED directly to DELIVERED)", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockOrderRecord as any);

      await expect(
        service.updateOrderStatusAsAdmin(orderId, "staff@verona.com", OrderStatus.DELIVERED)
      ).rejects.toThrow(AppError);
    });
  });
});
