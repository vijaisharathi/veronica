import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as applyCouponRoute, DELETE as removeCouponRoute } from "@/app/api/cart/coupon/route";
import { cartService } from "@/modules/cart/cart.service";
import { getViewerIdentity } from "@/lib/session";
import { ValidationError } from "@/lib/errors";
import { CartDTO } from "@/modules/cart/cart.types";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/session", () => ({
  getViewerIdentity: vi.fn(),
  SESSION_COOKIE_NAME: "verona_session_id",
}));

vi.mock("@/modules/cart/cart.service", () => ({
  cartService: {
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    getCart: vi.fn(),
  },
}));

const mockCartWithCoupon: CartDTO = {
  id: "cart-123",
  status: "ACTIVE",
  items: [
    {
      id: "item-1",
      cartId: "cart-123",
      productId: "prod-1",
      variantId: "var-1",
      productName: "Silk Evening Gown",
      slug: "silk-evening-gown",
      image: "/images/gown.jpg",
      brand: "VÉRONA",
      selectedColor: "Noir",
      selectedSize: "M",
      sku: "SEG-BLK-M",
      quantity: 1,
      unitPriceMinor: 250000,
      unitPriceMajor: 2500,
      lineTotalMinor: 250000,
      lineTotalMajor: 2500,
      availability: "AVAILABLE",
      priceChanged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  itemCount: 1,
  distinctItemCount: 1,
  totals: {
    subtotalMinor: 250000,
    subtotalMajor: 2500,
    promotionDiscountMinor: 0,
    promotionDiscountMajor: 0,
    couponDiscountMinor: 50000, // ₹500 off
    couponDiscountMajor: 500,
    discountMinor: 50000,
    discountMajor: 500,
    shippingMinor: 0,
    taxMinor: 0,
    grandTotalMinor: 200000, // ₹2,000
    grandTotalMajor: 2000,
    currency: "INR",
  },
  couponCode: "SAVE500",
  pricingBreakdown: {
    currency: "INR",
    items: [],
    itemCount: 1,
    subtotalMinor: 250000,
    subtotalMajor: 2500,
    promotionDiscountMinor: 0,
    promotionDiscountMajor: 0,
    couponDiscountMinor: 50000,
    couponDiscountMajor: 500,
    totalDiscountMinor: 50000,
    totalDiscountMajor: 500,
    grandTotalMinor: 200000,
    grandTotalMajor: 2000,
    appliedCoupon: {
      id: "coupon-1",
      code: "SAVE500",
      type: "FIXED_AMOUNT" as any,
      value: 50000,
      discountAmountMinor: 50000,
      discountAmountMajor: 500,
    },
  },
  hasUnavailableItems: false,
  hasPriceChanges: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Phase 15 — Cart Coupon API Integration Tests", () => {
  const customerIdentity = {
    identity: { customerId: "customer-1" },
    guestSessionId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/cart/coupon", () => {
    it("successfully applies valid coupon and returns updated cart with breakdown", async () => {
      (getViewerIdentity as any).mockResolvedValue(customerIdentity);
      (cartService.applyCoupon as any).mockResolvedValue(mockCartWithCoupon);

      const request = new NextRequest("http://localhost:3000/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "save500" }),
      });

      const response = await applyCouponRoute(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.couponCode).toBe("SAVE500");
      expect(json.data.totals.couponDiscountMinor).toBe(50000);
      expect(json.data.totals.grandTotalMinor).toBe(200000);
      expect(cartService.applyCoupon).toHaveBeenCalledWith(
        { customerId: "customer-1" },
        "SAVE500"
      );
    });

    it("rejects request when coupon code is missing or too short", async () => {
      (getViewerIdentity as any).mockResolvedValue(customerIdentity);

      const request = new NextRequest("http://localhost:3000/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "a" }),
      });

      const response = await applyCouponRoute(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(cartService.applyCoupon).not.toHaveBeenCalled();
    });

    it("returns business validation error if minimum cart value is not met", async () => {
      (getViewerIdentity as any).mockResolvedValue(customerIdentity);
      (cartService.applyCoupon as any).mockRejectedValue(
        new ValidationError("Minimum cart value of ₹3,000 required for this coupon")
      );

      const request = new NextRequest("http://localhost:3000/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "MIN3000" }),
      });

      const response = await applyCouponRoute(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Minimum cart value of ₹3,000 required");
    });
  });

  describe("DELETE /api/cart/coupon", () => {
    it("successfully removes coupon and returns restored cart pricing", async () => {
      const restoredCart: CartDTO = {
        ...mockCartWithCoupon,
        couponCode: null,
        totals: {
          ...mockCartWithCoupon.totals,
          couponDiscountMinor: 0,
          discountMinor: 0,
          grandTotalMinor: mockCartWithCoupon.totals.subtotalMinor,
          grandTotalMajor: mockCartWithCoupon.totals.subtotalMajor,
        },
        pricingBreakdown: undefined,
      };

      (getViewerIdentity as any).mockResolvedValue(customerIdentity);
      (cartService.removeCoupon as any).mockResolvedValue(restoredCart);

      const response = await removeCouponRoute();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.couponCode).toBeNull();
      expect(json.data.totals.couponDiscountMinor).toBe(0);
      expect(json.data.totals.grandTotalMinor).toBe(250000);
      expect(cartService.removeCoupon).toHaveBeenCalledWith({ customerId: "customer-1" });
    });
  });
});
