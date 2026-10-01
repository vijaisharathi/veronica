/**
 * VÉRONA — Coupon & Campaign Domain Service
 *
 * Single authoritative service for coupon validation, business eligibility,
 * usage tracking, and administrative lifecycle management with audit trails.
 */

import { CouponModel, CouponUsageModel, CampaignModel } from "@/db/models";
import { connectToDatabase } from "@/db/client";
import { ICoupon, ICampaign, MinorUnits } from "@/types/database";
import { DiscountType, CampaignStatus } from "@/constants/status";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { minorToMajor } from "@/lib/money";
import { recordPricingAudit } from "./audit.service";
import {
  CouponDTO,
  CampaignDTO,
  CouponValidationResult,
} from "./pricing.types";
import {
  CreateCouponInputSchema,
  UpdateCouponInputSchema,
  CreateCampaignInputSchema,
  UpdateCampaignInputSchema,
} from "./pricing.validation";
import { validateData } from "@/lib/validation";

export class CouponService {
  /**
   * Normalize coupon code: trim and convert to uppercase
   */
  public normalizeCouponCode(code: string): string {
    return code.trim().toUpperCase();
  }

  public normalizeCode(code: string): string {
    return this.normalizeCouponCode(code);
  }

  /**
   * Validate a coupon against current cart contents and viewer identity.
   * Authoritative server validation enforcing dates, minCartValue, limits, and exclusions.
   */
  async validateCoupon(params: {
    code: string;
    customerId?: string;
    cartSubtotalMinor: MinorUnits;
    items: Array<{
      productId: string;
      variantId: string;
      categoryIds?: string[];
      brandId?: string;
      lineSubtotalMinor: MinorUnits;
    }>;
    now?: Date;
  }): Promise<CouponValidationResult> {
    await connectToDatabase();
    const normalizedCode = this.normalizeCouponCode(params.code);
    const now = params.now || new Date();

    const coupon = await CouponModel.findOne({
      code: normalizedCode,
      isDeleted: false,
    }).lean<ICoupon>();

    if (!coupon) {
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "COUPON_NOT_FOUND",
        errorMessage: "The promotional code entered is invalid or does not exist.",
      };
    }

    if (!coupon.active) {
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "COUPON_DISABLED",
        errorMessage: "This promotional code has been deactivated.",
      };
    }

    if (now < new Date(coupon.startAt)) {
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "COUPON_NOT_STARTED",
        errorMessage: "This promotion has not started yet.",
      };
    }

    if (now >= new Date(coupon.expiresAt)) {
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "COUPON_EXPIRED",
        errorMessage: "This promotional code has expired.",
      };
    }

    // Global usage limit check
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "COUPON_USAGE_LIMIT_REACHED",
        errorMessage: "The maximum global usage limit for this coupon has been reached.",
      };
    }

    // Per-customer usage limit check (requires authenticated customer)
    if (params.customerId && coupon.perCustomerUsageLimit > 0) {
      const customerRedemptions = await CouponUsageModel.countDocuments({
        couponId: coupon._id.toString(),
        customerId: params.customerId,
      });

      if (customerRedemptions >= coupon.perCustomerUsageLimit) {
        return {
          isValid: false,
          code: normalizedCode,
          discountMinor: 0,
          errorCode: "CUSTOMER_USAGE_LIMIT_REACHED",
          errorMessage: `You have already redeemed this coupon the maximum allowed (${coupon.perCustomerUsageLimit}) times.`,
        };
      }
    }

    // Minimum cart value check (in paise)
    if (coupon.minCartValue > 0 && params.cartSubtotalMinor < coupon.minCartValue) {
      const minMajor = minorToMajor(coupon.minCartValue);
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "MINIMUM_CART_VALUE_NOT_MET",
        errorMessage: `Minimum order value of ₹${minMajor.toLocaleString("en-IN")} required to use this coupon.`,
      };
    }

    // Evaluate target item eligibility and exclusions
    const hasProductTargets = coupon.applicableProductIds && coupon.applicableProductIds.length > 0;
    const hasCategoryTargets =
      coupon.applicableCategoryIds && coupon.applicableCategoryIds.length > 0;
    const hasBrandTargets = coupon.applicableBrandIds && coupon.applicableBrandIds.length > 0;
    const hasExclusions =
      (coupon.excludedProductIds && coupon.excludedProductIds.length > 0) ||
      (coupon.excludedCategoryIds && coupon.excludedCategoryIds.length > 0);

    const eligibleItems = params.items.filter((item) => {
      // 1. Check exclusions
      if (
        coupon.excludedProductIds?.some((id) => id.toString() === item.productId) ||
        coupon.excludedCategoryIds?.some((catId) =>
          item.categoryIds?.includes(catId.toString())
        )
      ) {
        return false;
      }

      // 2. If specific inclusions configured, must match at least one
      if (hasProductTargets || hasCategoryTargets || hasBrandTargets) {
        const matchesProduct = coupon.applicableProductIds?.some(
          (id) => id.toString() === item.productId
        );
        const matchesCategory = coupon.applicableCategoryIds?.some((catId) =>
          item.categoryIds?.includes(catId.toString())
        );
        const matchesBrand =
          item.brandId &&
          coupon.applicableBrandIds?.some((bId) => bId.toString() === item.brandId);

        return Boolean(matchesProduct || matchesCategory || matchesBrand);
      }

      return true;
    });

    if (eligibleItems.length === 0) {
      return {
        isValid: false,
        code: normalizedCode,
        discountMinor: 0,
        errorCode: "COUPON_NOT_APPLICABLE",
        errorMessage: "This coupon is not applicable to any garments currently in your bag.",
      };
    }

    // Calculate qualifying subtotal for the coupon
    const qualifyingSubtotalMinor = eligibleItems.reduce(
      (sum, item) => sum + (item.lineSubtotalMinor ?? (item as any).lineTotalMinor ?? 0),
      0
    );

    let calculatedDiscountMinor: MinorUnits = 0;

    if (coupon.type === DiscountType.PERCENTAGE) {
      // Standard commercial rounding on integer minor units (paise)
      calculatedDiscountMinor = Math.round((qualifyingSubtotalMinor * coupon.value) / 100);
    } else if (coupon.type === DiscountType.FIXED_AMOUNT) {
      calculatedDiscountMinor = coupon.value;
    }

    // Apply maximum discount cap if configured
    if (coupon.maxDiscountAmount != null && coupon.maxDiscountAmount > 0) {
      calculatedDiscountMinor = Math.min(calculatedDiscountMinor, coupon.maxDiscountAmount);
    }

    // Never exceed qualifying items subtotal
    calculatedDiscountMinor = Math.min(calculatedDiscountMinor, qualifyingSubtotalMinor);
    // Discount floor at 0
    calculatedDiscountMinor = Math.max(0, calculatedDiscountMinor);

    return {
      isValid: true,
      code: normalizedCode,
      couponId: coupon._id.toString(),
      discountMinor: calculatedDiscountMinor,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      eligibleItemIds: eligibleItems.map((i) => i.productId),
      coupon: {
        id: coupon._id.toString(),
        code: normalizedCode,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
    };
  }

  /**
   * Record permanent coupon redemption upon successful order completion (Phase 17/18/19).
   */
  async recordCouponUsage(params: {
    couponId: string;
    customerId: string;
    orderId?: string;
    cartId?: string;
    discountAmountMinor: MinorUnits;
  }): Promise<void> {
    await connectToDatabase();
    await CouponUsageModel.create({
      couponId: params.couponId,
      customerId: params.customerId,
      orderId: params.orderId,
      cartId: params.cartId,
      discountAmountMinor: params.discountAmountMinor,
      usedAt: new Date(),
    });

    await CouponModel.updateOne(
      { _id: params.couponId },
      { $inc: { usageCount: 1 } }
    );

    logger.info("Recorded coupon redemption", {
      context: "CouponService",
      metadata: { couponId: params.couponId, customerId: params.customerId },
    });
  }

  // -------------------------------------------------------------
  // ADMIN COUPON MANAGEMENT
  // -------------------------------------------------------------

  async listCoupons(params: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
    status?: string;
  }): Promise<{ coupons: CouponDTO[]; total: number; page: number; totalPages: number }> {
    await connectToDatabase();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (params.active !== undefined) {
      filter.active = params.active;
    }
    if (params.status === "active") {
      filter.active = true;
    } else if (params.status === "inactive") {
      filter.active = false;
    }
    if (params.search) {
      filter.code = { $regex: params.search.trim().toUpperCase(), $options: "i" };
    }

    const [coupons, total] = await Promise.all([
      CouponModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ICoupon[]>(),
      CouponModel.countDocuments(filter),
    ]);

    return {
      coupons: coupons.map((c) => this.mapToCouponDTO(c)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCouponById(id: string): Promise<CouponDTO> {
    await connectToDatabase();
    const coupon = await CouponModel.findOne({ _id: id, isDeleted: false }).lean<ICoupon>();
    if (!coupon) {
      throw new NotFoundError("Coupon", id);
    }
    return this.mapToCouponDTO(coupon);
  }

  async createCoupon(input: unknown, auditContext: string | { actorId: string; actorEmail?: string; ipAddress?: string }): Promise<CouponDTO> {
    const staffId = typeof auditContext === "string" ? auditContext : auditContext.actorId;
    await connectToDatabase();
    const validated = validateData(CreateCouponInputSchema, input);

    const existing = await CouponModel.findOne({ code: validated.code, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Coupon with code '${validated.code}' already exists`);
    }

    const created = await CouponModel.create({
      ...validated,
      createdBy: staffId,
      usageCount: 0,
      isDeleted: false,
    });

    const dto = this.mapToCouponDTO(created.toObject());

    await recordPricingAudit({
      actorId: staffId,
      action: "COUPON_CREATED",
      entityType: "COUPON",
      entityId: created._id.toString(),
      after: dto as unknown as Record<string, unknown>,
    });

    return dto;
  }

  async updateCoupon(id: string, input: unknown, auditContext: string | { actorId: string; actorEmail?: string; ipAddress?: string }): Promise<CouponDTO> {
    const staffId = typeof auditContext === "string" ? auditContext : auditContext.actorId;
    await connectToDatabase();
    const validated = validateData(UpdateCouponInputSchema, input);

    const existing = await CouponModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Coupon", id);
    }

    const beforeState = this.mapToCouponDTO(existing.toObject());

    if (validated.code && validated.code !== existing.code) {
      const codeConflict = await CouponModel.findOne({
        _id: { $ne: id },
        code: validated.code,
        isDeleted: false,
      });
      if (codeConflict) {
        throw new ConflictError(`Coupon code '${validated.code}' is already in use`);
      }
    }

    const updated = await CouponModel.findByIdAndUpdate(
      id,
      { $set: validated },
      { new: true }
    ).lean<ICoupon>();

    if (!updated) {
      throw new NotFoundError("Coupon", id);
    }

    const afterState = this.mapToCouponDTO(updated);

    await recordPricingAudit({
      actorId: staffId,
      action: "COUPON_UPDATED",
      entityType: "COUPON",
      entityId: id,
      before: beforeState as unknown as Record<string, unknown>,
      after: afterState as unknown as Record<string, unknown>,
    });

    return afterState;
  }

  async deleteCoupon(id: string, auditContext: string | { actorId: string; actorEmail?: string; ipAddress?: string }): Promise<boolean> {
    const staffId = typeof auditContext === "string" ? auditContext : auditContext.actorId;
    await connectToDatabase();
    const existing = await CouponModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Coupon", id);
    }

    const beforeState = this.mapToCouponDTO(existing.toObject());

    await CouponModel.updateOne(
      { _id: id },
      { $set: { isDeleted: true, deletedAt: new Date(), active: false } }
    );

    await recordPricingAudit({
      actorId: staffId,
      action: "COUPON_DELETED",
      entityType: "COUPON",
      entityId: id,
      before: beforeState as unknown as Record<string, unknown>,
    });

    return true;
  }

  // -------------------------------------------------------------
  // ADMIN CAMPAIGN MANAGEMENT
  // -------------------------------------------------------------

  async listCampaigns(params: {
    page?: number;
    limit?: number;
    status?: CampaignStatus;
    search?: string;
  }): Promise<{ campaigns: CampaignDTO[]; total: number; page: number; totalPages: number }> {
    await connectToDatabase();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (params.status) {
      filter.status = params.status;
    }
    if (params.search) {
      filter.name = { $regex: params.search.trim(), $options: "i" };
    }

    const [campaigns, total] = await Promise.all([
      CampaignModel.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<ICampaign[]>(),
      CampaignModel.countDocuments(filter),
    ]);

    return {
      campaigns: campaigns.map((c) => this.mapToCampaignDTO(c)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCampaignById(id: string): Promise<CampaignDTO> {
    await connectToDatabase();
    const campaign = await CampaignModel.findOne({ _id: id, isDeleted: false }).lean<ICampaign>();
    if (!campaign) {
      throw new NotFoundError("Campaign", id);
    }
    return this.mapToCampaignDTO(campaign);
  }

  async createCampaign(input: unknown, auditContext: string | { actorId: string; actorEmail?: string; ipAddress?: string }): Promise<CampaignDTO> {
    const staffId = typeof auditContext === "string" ? auditContext : auditContext.actorId;
    await connectToDatabase();
    const validated = validateData(CreateCampaignInputSchema, input);

    const slug = validated.slug || validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const existing = await CampaignModel.findOne({ slug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Campaign with slug '${slug}' already exists`);
    }

    const created = await CampaignModel.create({
      ...validated,
      slug,
      discountConfig: {
        type: validated.discountType,
        value: validated.discountValue,
      },
      isDeleted: false,
    });

    const dto = this.mapToCampaignDTO(created.toObject());

    await recordPricingAudit({
      actorId: staffId,
      action: "CAMPAIGN_CREATED",
      entityType: "CAMPAIGN",
      entityId: created._id.toString(),
      after: dto as unknown as Record<string, unknown>,
    });

    return dto;
  }

  async updateCampaign(id: string, input: unknown, auditContext: string | { actorId: string; actorEmail?: string; ipAddress?: string }): Promise<CampaignDTO> {
    const staffId = typeof auditContext === "string" ? auditContext : auditContext.actorId;
    await connectToDatabase();
    const validated = validateData(UpdateCampaignInputSchema, input);

    const existing = await CampaignModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Campaign", id);
    }

    const beforeState = this.mapToCampaignDTO(existing.toObject());

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.discountType || validated.discountValue) {
      updateData.discountConfig = {
        type: validated.discountType || existing.discountConfig.type,
        value: validated.discountValue ?? existing.discountConfig.value,
      };
    }

    const updated = await CampaignModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean<ICampaign>();

    if (!updated) {
      throw new NotFoundError("Campaign", id);
    }

    const afterState = this.mapToCampaignDTO(updated);

    await recordPricingAudit({
      actorId: staffId,
      action: "CAMPAIGN_UPDATED",
      entityType: "CAMPAIGN",
      entityId: id,
      before: beforeState as unknown as Record<string, unknown>,
      after: afterState as unknown as Record<string, unknown>,
    });

    return afterState;
  }

  async deleteCampaign(id: string, auditContext: string | { actorId: string; actorEmail?: string; ipAddress?: string }): Promise<boolean> {
    const staffId = typeof auditContext === "string" ? auditContext : auditContext.actorId;
    await connectToDatabase();
    const existing = await CampaignModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Campaign", id);
    }

    const beforeState = this.mapToCampaignDTO(existing.toObject());

    await CampaignModel.updateOne(
      { _id: id },
      { $set: { isDeleted: true, deletedAt: new Date(), status: CampaignStatus.EXPIRED } }
    );

    await recordPricingAudit({
      actorId: staffId,
      action: "CAMPAIGN_DELETED",
      entityType: "CAMPAIGN",
      entityId: id,
      before: beforeState as unknown as Record<string, unknown>,
    });

    return true;
  }

  private mapToCouponDTO(c: ICoupon): CouponDTO {
    return {
      id: c._id.toString(),
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      minCartValue: c.minCartValue,
      minCartValueMajor: minorToMajor(c.minCartValue),
      maxDiscountAmount: c.maxDiscountAmount ?? null,
      maxDiscountAmountMajor: c.maxDiscountAmount ? minorToMajor(c.maxDiscountAmount) : null,
      usageLimit: c.usageLimit ?? null,
      perCustomerUsageLimit: c.perCustomerUsageLimit,
      usageCount: c.usageCount,
      startAt: new Date(c.startAt).toISOString(),
      expiresAt: new Date(c.expiresAt).toISOString(),
      applicableProductIds: (c.applicableProductIds || []).map((id) => id.toString()),
      applicableCategoryIds: (c.applicableCategoryIds || []).map((id) => id.toString()),
      applicableBrandIds: (c.applicableBrandIds || []).map((id) => id.toString()),
      excludedProductIds: (c.excludedProductIds || []).map((id) => id.toString()),
      excludedCategoryIds: (c.excludedCategoryIds || []).map((id) => id.toString()),
      active: c.active,
      stackable: c.stackable,
      createdBy: c.createdBy,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapToCampaignDTO(c: ICampaign): CampaignDTO {
    return {
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      banner: c.banner,
      startAt: new Date(c.startAt).toISOString(),
      endAt: new Date(c.endAt).toISOString(),
      status: c.status,
      priority: c.priority,
      discountType: c.discountConfig.type,
      discountValue: c.discountConfig.value,
      targetCategoryIds: (c.targetCategoryIds || []).map((id) => id.toString()),
      targetProductIds: (c.targetProductIds || []).map((id) => id.toString()),
      targetCollectionIds: (c.targetCollectionIds || []).map((id) => id.toString()),
      targetBrandIds: (c.targetBrandIds || []).map((id) => id.toString()),
      maxDiscountAmount: c.maxDiscountAmount ?? null,
      stackable: Boolean(c.stackable),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}

export const couponService = new CouponService();
