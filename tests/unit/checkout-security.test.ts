import { describe, it, expect, vi, beforeEach } from "vitest";
import { CheckoutService } from "@/modules/checkout/checkout.service";
import { CheckoutRepository } from "@/modules/checkout/checkout.repository";
import { addressService } from "@/modules/addresses";
import { sanitizeReturnUrl } from "@/lib/url";
import { AuthorizationError } from "@/lib/errors";

vi.mock("@/modules/addresses", () => ({
  addressService: {
    getAddress: vi.fn(),
  },
}));

describe("Phase 17 — Checkout Security & Anti-IDOR Unit Tests", () => {
  let mockRepo: CheckoutRepository;
  let service: CheckoutService;

  const customerA = "507f1f77bcf86cd799439011";
  const customerB = "507f1f77bcf86cd799439099";
  const sessionAId = "507f1f77bcf86cd799439055";

  const sessionOfCustomerA = {
    _id: sessionAId as any,
    customerId: customerA as any,
    cartId: "507f1f77bcf86cd799439033" as any,
    selectedAddressId: "507f1f77bcf86cd799439077" as any,
    status: "ACTIVE",
    addressSnapshot: {
      addressId: "507f1f77bcf86cd799439077",
      fullName: "Customer A",
      phone: "+91 98200 98200",
      postalCode: "400020",
    },
    pricingSnapshot: {
      subtotalMinor: 100000,
      promotionDiscountMinor: 0,
      couponDiscountMinor: 0,
      totalDiscountMinor: 0,
      amountDueBeforePaymentMinor: 100000,
      currency: "INR",
      pricingVersion: "v_1",
      calculatedAt: new Date().toISOString(),
    },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      findById: vi.fn(),
      findActiveByCustomer: vi.fn(),
      findByIdAndCustomer: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      expireOtherActiveSessions: vi.fn(),
      markCompleted: vi.fn(),
    } as any;

    service = new CheckoutService(mockRepo);
  });

  describe("Anti-IDOR Protection", () => {
    it("prevents Customer B from accessing Customer A's checkout session", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(sessionOfCustomerA as any);

      await expect(service.getCheckout(customerB, sessionAId)).rejects.toThrow(
        AuthorizationError
      );
    });

    it("prevents Customer B from changing address on Customer A's checkout session", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(sessionOfCustomerA as any);

      await expect(
        service.selectAddress(customerB, sessionAId, "507f1f77bcf86cd799439088")
      ).rejects.toThrow(AuthorizationError);
    });

    it("prevents Customer A from selecting an address owned by Customer B", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(sessionOfCustomerA as any);
      vi.mocked(addressService.getAddress).mockRejectedValueOnce(
        new AuthorizationError("Access denied: You do not own this address", "ADDRESS_NOT_OWNED")
      );

      await expect(
        service.selectAddress(customerA, sessionAId, "address_owned_by_b")
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Redirect URL Sanitization", () => {
    it("safely preserves relative internal /checkout path", () => {
      const safe = sanitizeReturnUrl("/checkout");
      expect(safe).toBe("/checkout");
    });

    it("rejects external open redirects", () => {
      expect(sanitizeReturnUrl("https://evil.com/phish")).toBe("/");
      expect(sanitizeReturnUrl("//evil.com")).toBe("/");
      expect(sanitizeReturnUrl("/\\evil.com")).toBe("/");
    });

    it("rejects protocol injection schemes", () => {
      expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/");
      expect(sanitizeReturnUrl("data:text/html,evil")).toBe("/");
    });
  });
});
