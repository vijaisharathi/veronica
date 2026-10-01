import { describe, it, expect, vi, beforeEach } from "vitest";
import { pricingService } from "@/modules/pricing/pricing.service";
import { CampaignModel, CouponModel, CouponUsageModel } from "@/db/models";
import { CampaignStatus, CouponStatus, DiscountType } from "@/constants/status";
import { ICampaign } from "@/types/database";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/models", () => ({
  CampaignModel: {
    find: vi.fn(),
  },
  ProductModel: {
    findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
  CouponModel: {
    findOne: vi.fn(),
  },
  CouponUsageModel: {
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
}));

describe("Phase 15 — Pricing Engine Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Commercial Rounding & Minor Unit Calculation", () => {
    it("correctly calculates percentage discounts in paise using commercial half-up rounding", () => {
      // 10% of 99900 paise (₹999.00) = 9990 paise (₹99.90)
      expect(pricingService.calculatePercentageDiscount(99900, 10)).toBe(9990);

      // 15% of 149900 paise (₹1,499.00) = 22485 paise (₹224.85)
      expect(pricingService.calculatePercentageDiscount(149900, 15)).toBe(22485);

      // 33% of 1000 paise = 330 paise
      expect(pricingService.calculatePercentageDiscount(1000, 33)).toBe(330);

      // 0% discount produces 0
      expect(pricingService.calculatePercentageDiscount(50000, 0)).toBe(0);

      // 100% discount produces full amount
      expect(pricingService.calculatePercentageDiscount(50000, 100)).toBe(50000);
    });

    it("enforces non-negative results and handles edge cases", () => {
      expect(pricingService.calculatePercentageDiscount(-500, 20)).toBe(0);
      expect(pricingService.calculatePercentageDiscount(5000, -10)).toBe(0);
    });
  });

  describe("calculateProductPrice", () => {
    const mockCampaigns: Partial<ICampaign>[] = [
      {
        _id: "campaign-1" as any,
        name: "Spring Sale 20% Off",
        status: CampaignStatus.ACTIVE,
        priority: 100,
        startAt: new Date("2026-01-01T00:00:00Z"),
        endAt: new Date("2026-12-31T23:59:59Z"),
        discountConfig: {
          type: DiscountType.PERCENTAGE,
          value: 20,
        },
        targetProductIds: ["product-123" as any],
        targetCategoryIds: [],
        targetCollectionIds: [],
        targetBrandIds: [],
        isDeleted: false,
      },
    ];

    it("evaluates base price when no promotions apply", async () => {
      (CampaignModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const pricing = await pricingService.calculateProductPrice({
        productId: "product-999",
        mrpMinor: 149900,
        sellingPriceMinor: 99900,
      });

      expect(pricing.mrpMinor).toBe(149900);
      expect(pricing.sellingPriceMinor).toBe(99900);
      expect(pricing.effectivePriceMinor).toBe(99900);
      expect(pricing.hasPromotion).toBe(false);
      expect(pricing.promotionDiscountMinor).toBe(0);
      expect(pricing.appliedPromotion).toBeNull();
      // (149900 - 99900) / 149900 = ~33%
      expect(pricing.discountPercent).toBe(33);
    });

    it("applies matching active promotional campaign to product", async () => {
      (CampaignModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockCampaigns),
        }),
      });

      const pricing = await pricingService.calculateProductPrice({
        productId: "product-123",
        mrpMinor: 200000, // ₹2,000
        sellingPriceMinor: 100000, // ₹1,000 base
      });

      // 20% of 100000 = 20000 paise (₹200)
      expect(pricing.promotionDiscountMinor).toBe(20000);
      expect(pricing.effectivePriceMinor).toBe(80000); // ₹800
      expect(pricing.hasPromotion).toBe(true);
      expect(pricing.appliedPromotion?.campaignId).toBe("campaign-1");
      expect(pricing.appliedPromotion?.name).toBe("Spring Sale 20% Off");
      // Total savings: 200000 - 80000 = 120000; 120000 / 200000 = 60%
      expect(pricing.discountPercent).toBe(60);
    });

    it("caps campaign discount when maxDiscountAmount is configured", async () => {
      const cappedCampaign = [
        {
          ...mockCampaigns[0],
          maxDiscountAmount: 15000, // Max ₹150 cap
        },
      ];

      (CampaignModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(cappedCampaign),
        }),
      });

      const pricing = await pricingService.calculateProductPrice({
        productId: "product-123",
        mrpMinor: 200000,
        sellingPriceMinor: 100000, // 20% would be 20000, but cap is 15000
      });

      expect(pricing.promotionDiscountMinor).toBe(15000);
      expect(pricing.effectivePriceMinor).toBe(85000);
    });
  });

  describe("calculateCartPricing", () => {
    it("returns zero breakdown for empty cart", async () => {
      const breakdown = await pricingService.calculateCartPricing({
        items: [],
      });

      expect(breakdown.subtotalMinor).toBe(0);
      expect(breakdown.grandTotalMinor).toBe(0);
      expect(breakdown.items).toHaveLength(0);
    });

    it("calculates accurate line subtotals without promotions or coupons", async () => {
      (CampaignModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      const breakdown = await pricingService.calculateCartPricing({
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            quantity: 2,
            unitPriceMinor: 150000, // 2 * ₹1500 = ₹3000
          },
          {
            productId: "prod-2",
            variantId: "var-2",
            quantity: 1,
            unitPriceMinor: 200000, // 1 * ₹2000 = ₹2000
          },
        ],
      });

      expect(breakdown.subtotalMinor).toBe(500000);
      expect(breakdown.subtotalMajor).toBe(5000);
      expect(breakdown.promotionDiscountMinor).toBe(0);
      expect(breakdown.couponDiscountMinor).toBe(0);
      expect(breakdown.totalDiscountMinor).toBe(0);
      expect(breakdown.grandTotalMinor).toBe(500000);
      expect(breakdown.items[0]!.lineSubtotalMinor).toBe(300000);
      expect(breakdown.items[1]!.lineSubtotalMinor).toBe(200000);
    });

    it("evaluates campaign priority when multiple campaigns exist", async () => {
      const campaigns: Partial<ICampaign>[] = [
        {
          _id: "high-priority" as any,
          name: "High Priority 30% Off",
          status: CampaignStatus.ACTIVE,
          priority: 200,
          startAt: new Date("2026-01-01"),
          endAt: new Date("2026-12-31"),
          discountConfig: { type: DiscountType.PERCENTAGE, value: 30 },
          targetProductIds: ["prod-1" as any],
          targetCategoryIds: [],
          targetCollectionIds: [],
          targetBrandIds: [],
          isDeleted: false,
        },
        {
          _id: "low-priority" as any,
          name: "Low Priority 10% Off",
          status: CampaignStatus.ACTIVE,
          priority: 50,
          startAt: new Date("2026-01-01"),
          endAt: new Date("2026-12-31"),
          discountConfig: { type: DiscountType.PERCENTAGE, value: 10 },
          targetProductIds: ["prod-1" as any],
          targetCategoryIds: [],
          targetCollectionIds: [],
          targetBrandIds: [],
          isDeleted: false,
        },
      ];

      (CampaignModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(campaigns),
        }),
      });

      const breakdown = await pricingService.calculateCartPricing({
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            quantity: 1,
            unitPriceMinor: 100000, // ₹1,000
          },
        ],
      });

      // Higher priority 30% wins over 10%
      expect(breakdown.promotionDiscountMinor).toBe(30000);
      expect(breakdown.grandTotalMinor).toBe(70000);
      expect(breakdown.items[0]!.appliedPromotion?.campaignId).toBe("high-priority");
    });

    it("enforces discount floor so totals never become negative", async () => {
      const hugeDiscountCampaign: Partial<ICampaign>[] = [
        {
          _id: "huge" as any,
          name: "Over-discount",
          status: CampaignStatus.ACTIVE,
          priority: 100,
          startAt: new Date("2026-01-01"),
          endAt: new Date("2026-12-31"),
          discountConfig: { type: DiscountType.FIXED_AMOUNT, value: 9999999 }, // ₹99,999 off
          targetProductIds: ["prod-1" as any],
          targetCategoryIds: [],
          targetCollectionIds: [],
          targetBrandIds: [],
          isDeleted: false,
        },
      ];

      (CampaignModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(hugeDiscountCampaign),
        }),
      });

      const breakdown = await pricingService.calculateCartPricing({
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            quantity: 1,
            unitPriceMinor: 50000, // ₹500
          },
        ],
      });

      // Discount cannot exceed line total
      expect(breakdown.items[0]!.finalLineTotalMinor).toBe(0);
      expect(breakdown.grandTotalMinor).toBe(0);
      expect(breakdown.promotionDiscountMinor).toBe(50000);
    });
  });
});
