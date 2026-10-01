import { describe, it, expect, vi, beforeEach } from "vitest";
import { couponService } from "@/modules/pricing/coupon.service";
import { CouponModel, CouponUsageModel, CampaignModel } from "@/db/models";
import { DiscountType, CampaignStatus } from "@/constants/status";
import { ICoupon } from "@/types/database";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/models", () => ({
  CouponModel: {
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    countDocuments: vi.fn(),
  },
  CouponUsageModel: {
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
  CampaignModel: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
  AuditLogModel: {
    create: vi.fn(),
  },
}));

describe("Phase 15 — Coupon Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseCoupon: Partial<ICoupon> = {
    _id: "coupon-123" as any,
    code: "VERONA20",
    description: "20% off atelier orders",
    type: DiscountType.PERCENTAGE,
    value: 20,
    minCartValue: 200000, // ₹2,000 minimum
    maxDiscountAmount: 100000, // ₹1,000 max cap
    usageLimit: 100,
    usageCount: 10,
    perCustomerUsageLimit: 1,
    startAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2026-12-31T23:59:59Z"),
    applicableProductIds: [],
    applicableCategoryIds: [],
    applicableBrandIds: [],
    excludedProductIds: [],
    excludedCategoryIds: [],
    active: true,
    stackable: false,
    isDeleted: false,
  };

  describe("Coupon Code Normalization", () => {
    it("normalizes coupon codes to trimmed uppercase", () => {
      expect(couponService.normalizeCode("  save20  ")).toBe("SAVE20");
      expect(couponService.normalizeCode("verona_VIP ")).toBe("VERONA_VIP");
    });
  });

  describe("validateCoupon Authoritative Rules", () => {
    it("rejects coupon if not found in database", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const result = await couponService.validateCoupon({
        code: "INVALID_CODE",
        cartSubtotalMinor: 500000,
        items: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("COUPON_NOT_FOUND");
    });

    it("rejects disabled coupon", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          ...baseCoupon,
          active: false,
        }),
      });

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 500000,
        items: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("COUPON_DISABLED");
    });

    it("rejects expired coupon", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          ...baseCoupon,
          expiresAt: new Date("2025-12-31T23:59:59Z"),
        }),
      });

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 500000,
        items: [],
        now: new Date("2026-06-01T00:00:00Z"),
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("COUPON_EXPIRED");
    });

    it("rejects coupon if current date is before start date", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          ...baseCoupon,
          startAt: new Date("2027-01-01T00:00:00Z"),
        }),
      });

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 500000,
        items: [],
        now: new Date("2026-06-01T00:00:00Z"),
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("COUPON_NOT_STARTED");
    });

    it("rejects coupon if global usage limit is reached", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          ...baseCoupon,
          usageLimit: 50,
          usageCount: 50,
        }),
      });

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 500000,
        items: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("COUPON_USAGE_LIMIT_REACHED");
    });

    it("rejects coupon if customer has exceeded per-customer limit", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(baseCoupon),
      });

      // Customer already redeemed once
      (CouponUsageModel.countDocuments as any).mockResolvedValue(1);

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        customerId: "cust-1",
        cartSubtotalMinor: 500000,
        items: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("CUSTOMER_USAGE_LIMIT_REACHED");
    });

    it("rejects coupon if minimum cart value is not met", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(baseCoupon), // requires 200000 paise (₹2,000)
      });
      (CouponUsageModel.countDocuments as any).mockResolvedValue(0);

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 150000, // ₹1,500 < ₹2,000
        items: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("MINIMUM_CART_VALUE_NOT_MET");
    });

    it("successfully applies percentage discount with cap", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(baseCoupon),
      });
      (CouponUsageModel.countDocuments as any).mockResolvedValue(0);

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 300000, // ₹3,000
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            categoryIds: [],
            lineSubtotalMinor: 300000,
          },
        ],
      });

      expect(result.isValid).toBe(true);
      // 20% of 300000 = 60000 paise (₹600), below ₹1,000 cap
      expect(result.discountMinor).toBe(60000);
      expect(result.coupon?.code).toBe("VERONA20");
    });

    it("enforces maximum discount cap for large carts", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(baseCoupon), // maxDiscountAmount: 100000 (₹1,000)
      });
      (CouponUsageModel.countDocuments as any).mockResolvedValue(0);

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 1000000, // ₹10,000 -> 20% is ₹2,000 (200000 paise)
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            categoryIds: [],
            lineSubtotalMinor: 1000000,
          },
        ],
      });

      expect(result.isValid).toBe(true);
      // Capped at 100000 paise (₹1,000)
      expect(result.discountMinor).toBe(100000);
    });

    it("respects excluded product targeting rules", async () => {
      (CouponModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          ...baseCoupon,
          excludedProductIds: ["prod-excluded"],
        }),
      });
      (CouponUsageModel.countDocuments as any).mockResolvedValue(0);

      const result = await couponService.validateCoupon({
        code: "VERONA20",
        cartSubtotalMinor: 500000,
        items: [
          {
            productId: "prod-excluded",
            variantId: "var-1",
            categoryIds: [],
            lineSubtotalMinor: 500000,
          },
        ],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("COUPON_NOT_APPLICABLE");
    });
  });

  describe("recordCouponUsage (Order Completion)", () => {
    it("atomically increments usage count and records usage audit", async () => {
      (CouponModel.updateOne as any).mockResolvedValue({ acknowledged: true });
      (CouponUsageModel.create as any).mockResolvedValue({ _id: "usage-1" });

      await couponService.recordCouponUsage({
        couponId: "coupon-123",
        customerId: "cust-1",
        orderId: "order-999",
        cartId: "cart-888",
        discountAmountMinor: 60000,
      });

      expect(CouponModel.updateOne).toHaveBeenCalledWith(
        { _id: "coupon-123" },
        { $inc: { usageCount: 1 } }
      );
      expect(CouponUsageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          couponId: "coupon-123",
          customerId: "cust-1",
          orderId: "order-999",
          discountAmountMinor: 60000,
        })
      );
    });
  });
});
