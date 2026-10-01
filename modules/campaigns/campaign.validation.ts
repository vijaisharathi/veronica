/**
 * VÉRONA — Marketing Campaign Validation Schemas (Phase 28)
 */

import { z } from "zod";
import { DiscountType, CampaignStatus } from "@/constants/status";

export const AdminCampaignCreateSchema = z.object({
  name: z.string().trim().min(3, "Campaign name must be at least 3 characters").max(150),
  slug: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  banner: z.string().url("Banner must be a valid URL").optional().or(z.literal("")),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  endAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  priority: z.coerce.number().int().optional().default(0),
  discountConfig: z.object({
    type: z.nativeEnum(DiscountType),
    value: z.coerce.number().positive("Discount value must be greater than 0"),
  }),
  targetCategoryIds: z.array(z.string().trim()).optional().default([]),
  targetProductIds: z.array(z.string().trim()).optional().default([]),
  targetCollectionIds: z.array(z.string().trim()).optional().default([]),
  targetBrandIds: z.array(z.string().trim()).optional().default([]),
  maxDiscountAmount: z.coerce.number().int().positive().optional(),
  stackable: z.boolean().optional().default(false),
  utm: z.object({
    source: z.string().trim().max(50).optional(),
    medium: z.string().trim().max(50).optional(),
    campaign: z.string().trim().max(100).optional(),
    content: z.string().trim().max(100).optional(),
    term: z.string().trim().max(100).optional(),
  }).optional(),
}).refine(
  (data) => new Date(data.endAt).getTime() > new Date(data.startAt).getTime(),
  {
    message: "Campaign end date must be strictly after start date",
    path: ["endAt"],
  }
);

export type AdminCampaignCreateInput = z.input<typeof AdminCampaignCreateSchema>;

export const AdminCampaignUpdateSchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  slug: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  banner: z.string().url().optional().or(z.literal("")),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  endAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  priority: z.coerce.number().int().optional(),
  discountConfig: z.object({
    type: z.nativeEnum(DiscountType),
    value: z.coerce.number().positive(),
  }).optional(),
  targetCategoryIds: z.array(z.string().trim()).optional(),
  targetProductIds: z.array(z.string().trim()).optional(),
  targetCollectionIds: z.array(z.string().trim()).optional(),
  targetBrandIds: z.array(z.string().trim()).optional(),
  maxDiscountAmount: z.coerce.number().int().positive().optional(),
  stackable: z.boolean().optional(),
  utm: z.object({
    source: z.string().trim().max(50).optional(),
    medium: z.string().trim().max(50).optional(),
    campaign: z.string().trim().max(100).optional(),
    content: z.string().trim().max(100).optional(),
    term: z.string().trim().max(100).optional(),
  }).optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
}).refine(
  (data) => {
    if (data.startAt && data.endAt) {
      return new Date(data.endAt).getTime() > new Date(data.startAt).getTime();
    }
    return true;
  },
  {
    message: "Campaign end date must be strictly after start date",
    path: ["endAt"],
  }
);

export type AdminCampaignUpdateInput = z.infer<typeof AdminCampaignUpdateSchema>;
