/**
 * VÉRONA — Central Pricing Domain Service
 *
 * Single authoritative source of truth for base pricing, variant pricing,
 * promotional campaigns, coupon evaluation, and deterministic monetary calculation.
 */

import { CampaignModel, ProductModel } from "@/db/models";
import { connectToDatabase } from "@/db/client";
import { IProduct, IProductVariant, ICampaign, MinorUnits } from "@/types/database";
import { CampaignStatus, DiscountType } from "@/constants/status";
import { minorToMajor } from "@/lib/money";
import { PRICING_CONFIG } from "@/config/pricing";
import { couponService } from "./coupon.service";
import {
  PricingContext,
  PricingBreakdownDTO,
  PricingItemBreakdown,
  ProductPricingDTO,
  AppliedCouponDTO,
} from "./pricing.types";

export class PricingService {
  /**
   * Deterministic percentage discount calculation in integer minor units (paise).
   * Uses standard commercial half-up rounding.
   */
  public calculatePercentageDiscount(amountMinor: MinorUnits, percentage: number): MinorUnits {
    if (amountMinor <= 0 || percentage <= 0) return 0;
    const boundedPercent = Math.min(PRICING_CONFIG.MAX_PERCENTAGE_DISCOUNT, percentage);
    const discount = Math.round((amountMinor * boundedPercent) / 100);
    return Math.min(amountMinor, Math.max(0, discount));
  }

  /**
   * Calculate authoritative product/variant pricing including any applicable active promotions.
   */
  async calculateProductPrice(params: {
    productId?: string;
    product?: IProduct | null;
    variantId?: string;
    variant?: IProductVariant | null;
    mrpMinor?: MinorUnits;
    sellingPriceMinor?: MinorUnits;
    now?: Date;
  }): Promise<ProductPricingDTO> {
    await connectToDatabase();
    const now = params.now || new Date();
    const product =
      params.product ||
      (params.productId ? await ProductModel.findById(params.productId).lean<IProduct>() : null);
    const variant = params.variant;
    const resolvedProductId = product ? product._id.toString() : params.productId || "";

    const mrpMinor: MinorUnits =
      params.mrpMinor ?? variant?.mrp ?? variant?.sellingPrice ?? (product as any)?.basePrice ?? 0;
    const sellingPriceMinor: MinorUnits =
      params.sellingPriceMinor ?? variant?.sellingPrice ?? (product as any)?.basePrice ?? 0;

    // Fetch active promotions
    const activeCampaigns = await CampaignModel.find({
      status: CampaignStatus.ACTIVE,
      startAt: { $lte: now },
      endAt: { $gt: now },
      isDeleted: false,
    })
      .sort({ priority: -1 })
      .lean<ICampaign[]>();

    // Resolve highest priority promotion applicable to this product
    const applicableCampaign = this.findApplicablePromotion(activeCampaigns, {
      productId: resolvedProductId,
      categoryIds: (product?.categoryIds || []).map((id) => id.toString()),
      collectionIds: (product?.collectionIds || []).map((id) => id.toString()),
      brandId: product?.brandId ? product.brandId.toString() : undefined,
    });

    let promotionDiscountMinor: MinorUnits = 0;
    let appliedPromotion: ProductPricingDTO["appliedPromotion"] = null;

    if (applicableCampaign && sellingPriceMinor > 0) {
      if (applicableCampaign.discountConfig.type === DiscountType.PERCENTAGE) {
        promotionDiscountMinor = this.calculatePercentageDiscount(
          sellingPriceMinor,
          applicableCampaign.discountConfig.value
        );
      } else if (applicableCampaign.discountConfig.type === DiscountType.FIXED_AMOUNT) {
        promotionDiscountMinor = Math.min(sellingPriceMinor, applicableCampaign.discountConfig.value);
      }

      if (
        applicableCampaign.maxDiscountAmount != null &&
        applicableCampaign.maxDiscountAmount > 0
      ) {
        promotionDiscountMinor = Math.min(
          promotionDiscountMinor,
          applicableCampaign.maxDiscountAmount
        );
      }

      appliedPromotion = {
        id: applicableCampaign._id.toString(),
        campaignId: applicableCampaign._id.toString(),
        name: applicableCampaign.name,
        type: applicableCampaign.discountConfig.type,
        value: applicableCampaign.discountConfig.value,
      };
    }

    const effectivePriceMinor = Math.max(0, sellingPriceMinor - promotionDiscountMinor);
    const totalSavingsMinor = mrpMinor > effectivePriceMinor ? mrpMinor - effectivePriceMinor : 0;
    const discountPercent = mrpMinor > 0 ? Math.round((totalSavingsMinor / mrpMinor) * 100) : 0;

    return {
      productId: resolvedProductId,
      variantId: variant?._id.toString() || params.variantId,
      mrpMinor,
      mrpMajor: minorToMajor(mrpMinor),
      sellingPriceMinor,
      sellingPriceMajor: minorToMajor(sellingPriceMinor),
      hasPromotion: promotionDiscountMinor > 0,
      promotionDiscountMinor,
      promotionDiscountMajor: minorToMajor(promotionDiscountMinor),
      effectivePriceMinor,
      effectivePriceMajor: minorToMajor(effectivePriceMinor),
      discountPercent,
      appliedPromotion,
    };
  }

  /**
   * Calculate complete, deterministic cart pricing breakdown.
   * Handles line totals, campaign promotions, coupon validation, stacking rules, and floors.
   */
  async calculateCartPricing(context: PricingContext): Promise<PricingBreakdownDTO> {
    await connectToDatabase();
    const now = context.timestamp || new Date();
    const items = context.items || [];

    if (items.length === 0) {
      return this.buildEmptyPricingBreakdown();
    }

    // 1. Fetch active campaigns
    const activeCampaigns = await CampaignModel.find({
      status: CampaignStatus.ACTIVE,
      startAt: { $lte: now },
      endAt: { $gt: now },
      isDeleted: false,
    })
      .sort({ priority: -1 })
      .lean<ICampaign[]>();

    let totalSubtotalMinor: MinorUnits = 0;
    let totalPromotionDiscountMinor: MinorUnits = 0;

    // 2. Calculate line item base prices & active campaign promotional discounts
    const lineItemBreakdowns: PricingItemBreakdown[] = [];

    for (const item of items) {
      const unitPriceMinor = Math.max(0, item.unitPriceMinor);
      const lineSubtotalMinor = unitPriceMinor * item.quantity;
      totalSubtotalMinor += lineSubtotalMinor;

      const applicableCampaign = this.findApplicablePromotion(activeCampaigns, {
        productId: item.productId,
        categoryIds: item.categoryIds || [],
        collectionIds: item.collectionIds || [],
        brandId: item.brandId,
      });

      let unitPromoDiscountMinor: MinorUnits = 0;
      let appliedPromotion: PricingItemBreakdown["appliedPromotion"] = null;

      if (applicableCampaign && unitPriceMinor > 0) {
        if (applicableCampaign.discountConfig.type === DiscountType.PERCENTAGE) {
          unitPromoDiscountMinor = this.calculatePercentageDiscount(
            unitPriceMinor,
            applicableCampaign.discountConfig.value
          );
        } else if (applicableCampaign.discountConfig.type === DiscountType.FIXED_AMOUNT) {
          unitPromoDiscountMinor = Math.min(unitPriceMinor, applicableCampaign.discountConfig.value);
        }

        if (
          applicableCampaign.maxDiscountAmount != null &&
          applicableCampaign.maxDiscountAmount > 0
        ) {
          unitPromoDiscountMinor = Math.min(
            unitPromoDiscountMinor,
            applicableCampaign.maxDiscountAmount
          );
        }

        appliedPromotion = {
          id: applicableCampaign._id.toString(),
          campaignId: applicableCampaign._id.toString(),
          name: applicableCampaign.name,
          type: applicableCampaign.discountConfig.type,
          value: applicableCampaign.discountConfig.value,
        };
      }

      const itemPromotionDiscountMinor = unitPromoDiscountMinor * item.quantity;
      totalPromotionDiscountMinor += itemPromotionDiscountMinor;

      lineItemBreakdowns.push({
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku || "",
        productName: item.productName || "Garment",
        quantity: item.quantity,
        mrpMinor: unitPriceMinor,
        unitPriceMinor,
        unitPriceMajor: minorToMajor(unitPriceMinor),
        lineSubtotalMinor,
        lineSubtotalMajor: minorToMajor(lineSubtotalMinor),
        itemPromotionDiscountMinor,
        itemPromotionDiscountMajor: minorToMajor(itemPromotionDiscountMinor),
        itemCouponDiscountMinor: 0,
        itemCouponDiscountMajor: 0,
        itemTotalDiscountMinor: itemPromotionDiscountMinor,
        itemTotalDiscountMajor: minorToMajor(itemPromotionDiscountMinor),
        finalLineTotalMinor: Math.max(0, lineSubtotalMinor - itemPromotionDiscountMinor),
        finalLineTotalMajor: minorToMajor(Math.max(0, lineSubtotalMinor - itemPromotionDiscountMinor)),
        appliedPromotion,
      });
    }

    // 3. Evaluate Coupon (if attached)
    let totalCouponDiscountMinor: MinorUnits = 0;
    let appliedCouponDTO: AppliedCouponDTO | null = null;
    let couponValidationMessage: string | null = null;

    if (context.couponCode) {
      const couponValidation = await couponService.validateCoupon({
        code: context.couponCode,
        customerId: context.customerId,
        cartSubtotalMinor: totalSubtotalMinor,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          categoryIds: i.categoryIds,
          brandId: i.brandId,
          lineSubtotalMinor: i.unitPriceMinor * i.quantity,
        })),
        now,
      });

      if (couponValidation.isValid && couponValidation.discountMinor > 0) {
        totalCouponDiscountMinor = couponValidation.discountMinor;

        // Apply coupon discount allocation across eligible lines
        const eligibleProductIds = new Set(couponValidation.eligibleItemIds || []);
        const eligibleItems = lineItemBreakdowns.filter((item) =>
          eligibleProductIds.has(item.productId)
        );

        const eligibleRemainingTotal = eligibleItems.reduce(
          (sum, item) => sum + item.finalLineTotalMinor,
          0
        );

        if (eligibleRemainingTotal > 0) {
          // Cap total coupon discount by remaining eligible amount
          totalCouponDiscountMinor = Math.min(totalCouponDiscountMinor, eligibleRemainingTotal);

          // Allocate proportionally
          let allocatedSoFar = 0;
          for (let i = 0; i < eligibleItems.length; i++) {
            const item = eligibleItems[i]!;
            if (i === eligibleItems.length - 1) {
              item.itemCouponDiscountMinor = totalCouponDiscountMinor - allocatedSoFar;
            } else {
              const share = Math.round(
                (item.finalLineTotalMinor / eligibleRemainingTotal) * totalCouponDiscountMinor
              );
              item.itemCouponDiscountMinor = share;
              allocatedSoFar += share;
            }

            item.itemCouponDiscountMajor = minorToMajor(item.itemCouponDiscountMinor);
            item.itemTotalDiscountMinor =
              item.itemPromotionDiscountMinor + item.itemCouponDiscountMinor;
            item.itemTotalDiscountMajor = minorToMajor(item.itemTotalDiscountMinor);
            item.finalLineTotalMinor = Math.max(
              0,
              item.lineSubtotalMinor - item.itemTotalDiscountMinor
            );
            item.finalLineTotalMajor = minorToMajor(item.finalLineTotalMinor);
          }
        }

        appliedCouponDTO = {
          id: couponValidation.couponId || "",
          code: couponValidation.code,
          type: couponValidation.type || DiscountType.PERCENTAGE,
          value: couponValidation.value || 0,
          description: couponValidation.description,
          discountAmountMinor: totalCouponDiscountMinor,
          discountAmountMajor: minorToMajor(totalCouponDiscountMinor),
        };
      } else {
        couponValidationMessage = couponValidation.errorMessage || "Coupon is not applicable";
      }
    }

    // 4. Calculate final totals with strict floor boundaries
    const totalDiscountMinor = Math.min(
      totalSubtotalMinor,
      totalPromotionDiscountMinor + totalCouponDiscountMinor
    );
    const grandTotalMinor = Math.max(0, totalSubtotalMinor - totalDiscountMinor);
    const totalQuantity = lineItemBreakdowns.reduce((sum, item) => sum + item.quantity, 0);

    return {
      currency: PRICING_CONFIG.CURRENCY,
      items: lineItemBreakdowns,
      itemCount: totalQuantity,
      subtotalMinor: totalSubtotalMinor,
      subtotalMajor: minorToMajor(totalSubtotalMinor),
      promotionDiscountMinor: totalPromotionDiscountMinor,
      promotionDiscountMajor: minorToMajor(totalPromotionDiscountMinor),
      couponDiscountMinor: totalCouponDiscountMinor,
      couponDiscountMajor: minorToMajor(totalCouponDiscountMinor),
      totalDiscountMinor,
      totalDiscountMajor: minorToMajor(totalDiscountMinor),
      grandTotalMinor,
      grandTotalMajor: minorToMajor(grandTotalMinor),
      appliedCoupon: appliedCouponDTO,
      couponValidationMessage,
    };
  }

  /**
   * Find highest priority active campaign matching product attributes.
   */
  private findApplicablePromotion(
    campaigns: ICampaign[],
    item: {
      productId: string;
      categoryIds: string[];
      collectionIds: string[];
      brandId?: string;
    }
  ): ICampaign | null {
    for (const campaign of campaigns) {
      const matchesProduct = campaign.targetProductIds?.some(
        (id) => id.toString() === item.productId
      );
      const matchesCategory = campaign.targetCategoryIds?.some((catId) =>
        item.categoryIds.includes(catId.toString())
      );
      const matchesCollection = campaign.targetCollectionIds?.some((collId) =>
        item.collectionIds.includes(collId.toString())
      );
      const matchesBrand =
        item.brandId &&
        campaign.targetBrandIds?.some((bId) => bId.toString() === item.brandId);

      if (matchesProduct || matchesCategory || matchesCollection || matchesBrand) {
        return campaign;
      }
    }

    return null;
  }

  /**
   * Construct empty PricingBreakdownDTO representation
   */
  private buildEmptyPricingBreakdown(): PricingBreakdownDTO {
    return {
      currency: PRICING_CONFIG.CURRENCY,
      items: [],
      itemCount: 0,
      subtotalMinor: 0,
      subtotalMajor: 0,
      promotionDiscountMinor: 0,
      promotionDiscountMajor: 0,
      couponDiscountMinor: 0,
      couponDiscountMajor: 0,
      totalDiscountMinor: 0,
      totalDiscountMajor: 0,
      grandTotalMinor: 0,
      grandTotalMajor: 0,
      appliedCoupon: null,
      couponValidationMessage: null,
    };
  }
}

export const pricingService = new PricingService();
