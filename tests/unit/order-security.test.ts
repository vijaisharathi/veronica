import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "@/modules/orders/services/order.service";
import { OrderRepository } from "@/modules/orders/repositories/order.repository";
import { OrderStatus, PaymentStatus } from "@/constants/status";
import { AppError, NotFoundError, AuthorizationError } from "@/lib/errors";
import { PaymentModel, CheckoutSessionModel } from "@/db/models";

vi.mock("@/db/models", () => ({
  PaymentModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
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
}));

describe("Phase 19 — Order Security & IDOR Protection Unit Tests", () => {
  let mockRepo: OrderRepository;
  let service: OrderService;

  const legitimateCustomer = "cust_aria_12345";
  const maliciousAttacker = "cust_eve_99999";
  const orderNumber = "VRN-2026-X9Y8Z7";
  const paymentId = "pay_rzp_secure_123";

  const mockOrder = {
    _id: "order_111",
    orderNumber,
    customerId: legitimateCustomer,
    status: OrderStatus.CONFIRMED,
    pricing: { total: 149900, subtotal: 149900, discount: 0, shipping: 0, tax: 0, currency: "INR" },
    shippingAddress: { fullName: "Aria", phone: "123", addressLine1: "Road", city: "City", state: "State", country: "India", pincode: "400001" },
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      findByOrderNumber: vi.fn().mockResolvedValue(mockOrder),
      findById: vi.fn().mockResolvedValue(mockOrder),
      findByPaymentId: vi.fn().mockResolvedValue(null),
      getStatusHistory: vi.fn().mockResolvedValue([]),
      createOrder: vi.fn(),
      updateOrderStatus: vi.fn(),
      recordStatusHistory: vi.fn(),
    } as unknown as OrderRepository;

    service = new OrderService(mockRepo);
  });

  it("Anti-IDOR: Rejects unauthorized customer access with 404 (prevents order existence discovery)", async () => {
    await expect(
      service.getOrderByNumber(maliciousAttacker, orderNumber)
    ).rejects.toThrow(NotFoundError);
  });

  it("Payment IDOR: Rejects creating an order using another customer's payment", async () => {
    vi.mocked(PaymentModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: paymentId,
        customerId: legitimateCustomer,
        status: PaymentStatus.CAPTURED,
        amount: 149900,
        checkoutSessionId: "session_123",
      }),
    } as any);

    await expect(
      service.createOrderFromPayment(maliciousAttacker, { paymentId })
    ).rejects.toThrow(AuthorizationError);
  });

  it("Amount Tamper Resistance: Rejects order creation if payment amount differs from checkout snapshot", async () => {
    vi.mocked(PaymentModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: paymentId,
        customerId: legitimateCustomer,
        status: PaymentStatus.CAPTURED,
        amount: 99900, // Tampered ₹999
        checkoutSessionId: "session_123",
      }),
    } as any);

    vi.mocked(CheckoutSessionModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "session_123",
        customerId: legitimateCustomer,
        pricingSnapshot: {
          amountDueBeforePaymentMinor: 149900, // Authoritative ₹1499
        },
        addressSnapshot: { postalCode: "400001" },
      }),
    } as any);

    await expect(
      service.createOrderFromPayment(legitimateCustomer, { paymentId })
    ).rejects.toThrow(AppError);
  });
});
