/**
 * VÉRONA — Pricing & Coupon Validation Schemas
 *
 * Strict Zod validation schemas for coupon application and admin management.
 */

import { z } from "zod";
import { DiscountType, CampaignStatus } from "@/constants/status";
import { PRICING_CONFIG } from "@/config/pricing";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const ApplyCouponInputSchema = z.object({
  code: z
    .string({ required_error: "Coupon code is required" })
    .trim()
    .min(PRICING_CONFIG.MIN_COUPON_CODE_LENGTH, "Coupon code is too short")
    .max(PRICING_CONFIG.MAX_COUPON_CODE_LENGTH, "Coupon code is too long")
    .transform((val) => val.toUpperCase()),
});

const CreateCouponBaseSchema = z.object({
  code: z
    .string({ required_error: "Code is required" })
    .trim()
    .min(PRICING_CONFIG.MIN_COUPON_CODE_LENGTH)
    .max(PRICING_CONFIG.MAX_COUPON_CODE_LENGTH)
    .transform((val) => val.toUpperCase()),
  description: z.string().trim().max(300).optional(),
  type: z.nativeEnum(DiscountType, { required_error: "Discount type is required" }),
  value: z
    .number({ required_error: "Discount value is required" })
    .min(1, "Discount value must be greater than 0"),
  minCartValue: z
    .number()
    .int("Minimum cart value must be an integer minor unit (paise)")
    .min(0)
    .default(0),
  maxDiscountAmount: z
    .number()
    .int("Maximum discount must be an integer minor unit (paise)")
    .positive("Maximum discount must be positive")
    .nullable()
    .optional(),
  usageLimit: z
    .number()
    .int("Usage limit must be an integer")
    .min(1)
    .nullable()
    .optional(),
  perCustomerUsageLimit: z
    .number()
    .int("Per-customer usage limit must be an integer")
    .min(1)
    .default(1),
  startAt: z.coerce.date({ required_error: "Start date is required" }),
  expiresAt: z.coerce.date({ required_error: "Expiry date is required" }),
  applicableProductIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid productId"))
    .default([]),
  applicableCategoryIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid categoryId"))
    .default([]),
  applicableBrandIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid brandId"))
    .default([]),
  excludedProductIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid productId"))
    .default([]),
  excludedCategoryIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid categoryId"))
    .default([]),
  active: z.boolean().default(true),
  stackable: z.boolean().default(false),
});

export const CreateCouponInputSchema = CreateCouponBaseSchema
  .refine((data) => data.expiresAt > data.startAt, {
    message: "Expiry date must be after start date",
    path: ["expiresAt"],
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENTAGE) {
        return (
          data.value >= PRICING_CONFIG.MIN_PERCENTAGE_DISCOUNT &&
          data.value <= PRICING_CONFIG.MAX_PERCENTAGE_DISCOUNT
        );
      }
      return data.value >= PRICING_CONFIG.MIN_FIXED_DISCOUNT_PAISE;
    },
    {
      message: "Percentage discount must be 1-100%, fixed discount must be in valid paise (>= 100)",
      path: ["value"],
    }
  );

export const UpdateCouponInputSchema = CreateCouponBaseSchema.partial().refine(
  (data) => {
    if (data.startAt && data.expiresAt) {
      return data.expiresAt > data.startAt;
    }
    return true;
  },
  {
    message: "Expiry date must be after start date",
    path: ["expiresAt"],
  }
);

const CreateCampaignBaseSchema = z.object({
  name: z.string({ required_error: "Name is required" }).trim().min(2).max(150),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(500).optional(),
  banner: z.string().trim().optional(),
  startAt: z.coerce.date({ required_error: "Start date is required" }),
  endAt: z.coerce.date({ required_error: "End date is required" }),
  status: z.nativeEnum(CampaignStatus).default(CampaignStatus.DRAFT),
  priority: z.number().int().min(0).default(0),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive(),
  targetCategoryIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid categoryId"))
    .default([]),
  targetProductIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid productId"))
    .default([]),
  targetCollectionIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid collectionId"))
    .default([]),
  targetBrandIds: z
    .array(z.string().regex(OBJECT_ID_REGEX, "Invalid brandId"))
    .default([]),
  maxDiscountAmount: z.number().int().positive().nullable().optional(),
  stackable: z.boolean().default(false),
});

export const CreateCampaignInputSchema = CreateCampaignBaseSchema
  .refine((data) => data.endAt > data.startAt, {
    message: "End date must be after start date",
    path: ["endAt"],
  })
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE) {
        return (
          data.discountValue >= PRICING_CONFIG.MIN_PERCENTAGE_DISCOUNT &&
          data.discountValue <= PRICING_CONFIG.MAX_PERCENTAGE_DISCOUNT
        );
      }
      return data.discountValue >= PRICING_CONFIG.MIN_FIXED_DISCOUNT_PAISE;
    },
    {
      message: "Percentage discount must be 1-100%, fixed discount must be in valid paise (>= 100)",
      path: ["discountValue"],
    }
  );

export const UpdateCampaignInputSchema = CreateCampaignBaseSchema.partial().refine(
  (data) => {
    if (data.startAt && data.endAt) {
      return data.endAt > data.startAt;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endAt"],
  }
);
