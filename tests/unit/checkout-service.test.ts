import { describe, it, expect, vi, beforeEach } from "vitest";
import { CheckoutService } from "@/modules/checkout/checkout.service";
import { CheckoutRepository } from "@/modules/checkout/checkout.repository";
import { CheckoutSessionStatus } from "@/constants/status";
import { CheckoutIssueCode } from "@/modules/checkout/checkout.types";
import { cartService } from "@/modules/cart/cart.service";
import { pricingService } from "@/modules/pricing/pricing.service";
import { addressService } from "@/modules/addresses";
import { deliveryServiceabilityService } from "@/modules/delivery";
import { AppError, AuthorizationError, NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/modules/cart/cart.service", () => ({
  cartService: {
    getCart: vi.fn(),
  },
}));

vi.mock("@/modules/pricing/pricing.service", () => ({
  pricingService: {
    calculateCartPricing: vi.fn(),
  },
}));

vi.mock("@/modules/addresses", () => ({
  addressService: {
    listAddresses: vi.fn(),
    getAddress: vi.fn(),
  },
}));

vi.mock("@/modules/delivery", () => ({
  deliveryServiceabilityService: {
    checkServiceability: vi.fn(),
  },
}));

describe("Phase 17 — Checkout Domain Service Unit Tests", () => {
  let mockRepo: CheckoutRepository;
  let service: CheckoutService;

  const customerId = "507f1f77bcf86cd799439011";
  const otherCustomerId = "507f1f77bcf86cd799439099";
  const sessionId = "507f1f77bcf86cd799439055";
  const addressId = "507f1f77bcf86cd799439077";

  const mockAddress = {
    id: addressId,
    fullName: "Aria Sharma",
    phone: "+91 98200 98200",
    addressLine1: "123 Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400020",
    country: "India",
    isDefault: true,
  };

  const mockCart = {
    id: "507f1f77bcf86cd799439033",
    customerId,
    items: [
      {
        id: "item_1",
        productId: "507f1f77bcf86cd799439044",
        variantId: "507f1f77bcf86cd799439045",
        sku: "VER-DRS-SLK-01",
        productName: "Silk Atelier Evening Gown",
        brand: "VÉRONA",
        selectedSize: "M",
        selectedColor: "Midnight Black",
        quantity: 1,
        unitPriceMinor: 249900,
        unitPriceMajor: 2499,
        lineTotalMinor: 249900,
        lineTotalMajor: 2499,
        availability: "IN_STOCK",
        priceChanged: false,
      },
    ],
    couponCode: null,
  };

  const mockPricingBreakdown = {
    subtotalMinor: 249900,
    subtotalMajor: 2499,
    promotionDiscountMinor: 0,
    promotionDiscountMajor: 0,
    couponDiscountMinor: 0,
    couponDiscountMajor: 0,
    totalDiscountMinor: 0,
    totalDiscountMajor: 0,
    grandTotalMinor: 249900,
    grandTotalMajor: 2499,
    items: [],
  };

  const mockServiceability = {
    postalCode: "400020",
    serviceable: true,
    state: "SERVICEABLE",
    city: "Mumbai",
    stateName: "Maharashtra",
    estimatedDeliveryDays: { min: 2, max: 4 },
    source: "VÉRONA Express Logistics",
    checkedAt: new Date().toISOString(),
  };

  const mockActiveSession = {
    _id: sessionId as any,
    customerId: customerId as any,
    cartId: mockCart.id as any,
    selectedAddressId: addressId as any,
    status: CheckoutSessionStatus.ACTIVE,
    addressSnapshot: {
      addressId,
      fullName: mockAddress.fullName,
      phone: mockAddress.phone,
      addressLine1: mockAddress.addressLine1,
      city: mockAddress.city,
      state: mockAddress.state,
      postalCode: mockAddress.postalCode,
      country: mockAddress.country,
    },
    serviceabilitySnapshot: mockServiceability,
    pricingSnapshot: {
      subtotalMinor: 249900,
      promotionDiscountMinor: 0,
      couponDiscountMinor: 0,
      totalDiscountMinor: 0,
      amountDueBeforePaymentMinor: 249900,
      currency: "INR",
      pricingVersion: "v_1700000000000",
      calculatedAt: new Date().toISOString(),
    },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
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

  describe("initializeCheckout", () => {
    it("throws AppError CART_EMPTY if the bag is empty", async () => {
      vi.mocked(cartService.getCart).mockResolvedValueOnce({
        id: "cart_empty",
        items: [],
      } as any);

      await expect(service.initializeCheckout(customerId)).rejects.toThrow(
        /shopping bag is empty/i
      );
    });

    it("initializes a valid checkout session with default address & serviceability", async () => {
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCart as any);
      vi.mocked(mockRepo.findActiveByCustomer).mockResolvedValueOnce(null);
      vi.mocked(addressService.listAddresses).mockResolvedValueOnce([mockAddress] as any);
      vi.mocked(deliveryServiceabilityService.checkServiceability).mockResolvedValueOnce(
        mockServiceability as any
      );
      vi.mocked(pricingService.calculateCartPricing).mockResolvedValueOnce(
        mockPricingBreakdown as any
      );
      vi.mocked(mockRepo.create).mockResolvedValueOnce(mockActiveSession as any);

      const result = await service.initializeCheckout(customerId);

      expect(result.id).toBe(sessionId);
      expect(result.isValid).toBe(true);
      expect(result.canProceedToPayment).toBe(true);
      expect(result.pricing.amountDueBeforePaymentMinor).toBe(249900);
      expect(result.serviceability?.serviceable).toBe(true);
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it("flags PRICE_CHANGED issue if an item in the bag had a price change", async () => {
      const cartWithPriceChange = {
        ...mockCart,
        items: [
          {
            ...mockCart.items[0],
            priceChanged: true,
            previousPriceMinor: 229900,
            previousPriceMajor: 2299,
          },
        ],
      };

      vi.mocked(cartService.getCart).mockResolvedValueOnce(cartWithPriceChange as any);
      vi.mocked(mockRepo.findActiveByCustomer).mockResolvedValueOnce(null);
      vi.mocked(addressService.listAddresses).mockResolvedValueOnce([mockAddress] as any);
      vi.mocked(deliveryServiceabilityService.checkServiceability).mockResolvedValueOnce(
        mockServiceability as any
      );
      vi.mocked(pricingService.calculateCartPricing).mockResolvedValueOnce(
        mockPricingBreakdown as any
      );
      vi.mocked(mockRepo.create).mockResolvedValueOnce(mockActiveSession as any);

      const result = await service.initializeCheckout(customerId);

      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: CheckoutIssueCode.PRICE_CHANGED }),
        ])
      );
      expect(result.canProceedToPayment).toBe(false);
    });
  });

  describe("getCheckout", () => {
    it("throws NotFoundError if the checkout session does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(null);

      await expect(service.getCheckout(customerId, sessionId)).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws AuthorizationError if customer does not own the session (anti-IDOR)", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(mockActiveSession as any);

      await expect(service.getCheckout(otherCustomerId, sessionId)).rejects.toThrow(
        AuthorizationError
      );
    });

    it("marks and flags CHECKOUT_EXPIRED if session has expired past TTL", async () => {
      const expiredSession = {
        ...mockActiveSession,
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      };

      vi.mocked(mockRepo.findById).mockResolvedValueOnce(expiredSession as any);
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCart as any);

      const result = await service.getCheckout(customerId, sessionId);

      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: CheckoutIssueCode.CHECKOUT_EXPIRED }),
        ])
      );
      expect(result.canProceedToPayment).toBe(false);
      expect(mockRepo.update).toHaveBeenCalledWith(
        sessionId,
        customerId,
        expect.objectContaining({ status: CheckoutSessionStatus.EXPIRED })
      );
    });
  });

  describe("selectAddress", () => {
    it("switches address, updates snapshot, and re-evaluates delivery serviceability", async () => {
      const newAddress = {
        ...mockAddress,
        id: "507f1f77bcf86cd799439088",
        city: "Bengaluru",
        postalCode: "560001",
      };

      vi.mocked(mockRepo.findById).mockResolvedValueOnce(mockActiveSession as any);
      vi.mocked(addressService.getAddress).mockResolvedValueOnce(newAddress as any);
      vi.mocked(deliveryServiceabilityService.checkServiceability).mockResolvedValueOnce({
        postalCode: "560001",
        serviceable: true,
        state: "SERVICEABLE",
        city: "Bengaluru",
        stateName: "Karnataka",
        estimatedDeliveryDays: { min: 2, max: 3 },
        source: "VÉRONA Express Logistics",
        checkedAt: new Date().toISOString(),
      } as any);

      const updatedSession = {
        ...mockActiveSession,
        selectedAddressId: newAddress.id as any,
        addressSnapshot: {
          addressId: newAddress.id,
          fullName: newAddress.fullName,
          phone: newAddress.phone,
          addressLine1: newAddress.addressLine1,
          city: newAddress.city,
          state: newAddress.state,
          postalCode: newAddress.postalCode,
          country: newAddress.country,
        },
      };

      vi.mocked(mockRepo.update).mockResolvedValueOnce(updatedSession as any);
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCart as any);
      vi.mocked(pricingService.calculateCartPricing).mockResolvedValueOnce(
        mockPricingBreakdown as any
      );

      const result = await service.selectAddress(customerId, sessionId, newAddress.id);

      expect(result.selectedAddressId).toBe(newAddress.id);
      expect(result.addressSnapshot?.city).toBe("Bengaluru");
      expect(deliveryServiceabilityService.checkServiceability).toHaveBeenCalledWith({
        postalCode: "560001",
        country: "India",
      });
    });
  });

  describe("validateCheckout and getPaymentReadyContract", () => {
    it("returns valid: true when session is complete and serviceable", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(mockActiveSession as any);
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCart as any);
      vi.mocked(pricingService.calculateCartPricing).mockResolvedValueOnce(
        mockPricingBreakdown as any
      );

      const validation = await service.validateCheckout(customerId, sessionId);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("produces locked PaymentReadyCheckout contract for Phase 18", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(mockActiveSession as any);
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCart as any);
      vi.mocked(pricingService.calculateCartPricing).mockResolvedValueOnce(
        mockPricingBreakdown as any
      );

      const contract = await service.getPaymentReadyContract(customerId, sessionId);

      expect(contract.checkoutSessionId).toBe(sessionId);
      expect(contract.customerId).toBe(customerId);
      expect(contract.currency).toBe("INR");
      expect(contract.amountMinor).toBe(249900);
      expect(contract.addressSnapshot.postalCode).toBe("400020");
      expect(contract.serviceabilitySnapshot.serviceable).toBe(true);
    });

    it("throws ValidationError when attempting to produce contract with issues", async () => {
      const unserviceableSession = {
        ...mockActiveSession,
        serviceabilitySnapshot: {
          ...mockServiceability,
          serviceable: false,
          reason: "Out of delivery network",
        },
      };

      vi.mocked(mockRepo.findById).mockResolvedValueOnce(unserviceableSession as any);
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCart as any);
      vi.mocked(pricingService.calculateCartPricing).mockResolvedValueOnce(
        mockPricingBreakdown as any
      );

      await expect(service.getPaymentReadyContract(customerId, sessionId)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
