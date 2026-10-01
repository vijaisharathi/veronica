/**
 * VÉRONA — Content Management Validation Schemas (Phase 28)
 */

import { z } from "zod";

const AdminBannerBaseSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  subtitle: z.string().trim().max(300).optional(),
  desktopImage: z.string().url("Desktop image must be a valid URL"),
  mobileImage: z.string().url("Mobile image must be a valid URL").optional().or(z.literal("")),
  ctaText: z.string().trim().max(50).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
  placement: z.string().trim().min(2, "Placement is required").default("HOMEPAGE_HERO"),
  startAt: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  endAt: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const AdminBannerCreateSchema = AdminBannerBaseSchema.refine(
  (data) => {
    if (data.startAt && data.endAt) {
      return new Date(data.endAt).getTime() > new Date(data.startAt).getTime();
    }
    return true;
  },
  {
    message: "Banner end date must be after start date",
    path: ["endAt"],
  }
);

export type AdminBannerCreateInput = z.input<typeof AdminBannerCreateSchema>;

export const AdminBannerUpdateSchema = AdminBannerBaseSchema.partial().refine(
  (data) => {
    if (data.startAt && data.endAt) {
      return new Date(data.endAt).getTime() > new Date(data.startAt).getTime();
    }
    return true;
  },
  {
    message: "Banner end date must be after start date",
    path: ["endAt"],
  }
);
export type AdminBannerUpdateInput = z.infer<typeof AdminBannerUpdateSchema>;

export const AdminHomepageSectionUpdateSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  subtitle: z.string().trim().max(300).optional(),
  contentReferences: z.record(z.unknown()).optional(),
  configuration: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type AdminHomepageSectionUpdateInput = z.infer<typeof AdminHomepageSectionUpdateSchema>;

export const AdminSectionsReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, "At least one section ID required"),
});
export { AdminSectionsReorderSchema as AdminHomepageSectionReorderSchema };

export const AdminEditorialStoryCreateSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  slug: z.string().trim().min(3).max(200).optional(),
  excerpt: z
    .string()
    .trim()
    .min(10, "Excerpt must be at least 10 characters")
    .max(500)
    .optional()
    .or(z.literal(""))
    .default("Craftsmanship and bespoke tailoring insights."),
  content: z.string().min(20, "Content must be at least 20 characters"),
  heroImage: z
    .string()
    .url("Hero image must be a valid URL")
    .optional()
    .or(z.literal(""))
    .default("https://images.unsplash.com/photo-editorial-craft.jpg"),
  author: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  publishedAt: z.string().datetime().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  seo: z.object({
    title: z.string().trim().max(150).optional(),
    description: z.string().trim().max(300).optional(),
    keywords: z.array(z.string().trim()).optional(),
  }).optional(),
});

export type AdminEditorialStoryCreateInput = z.input<typeof AdminEditorialStoryCreateSchema>;

export const AdminEditorialStoryUpdateSchema = AdminEditorialStoryCreateSchema.partial();
export type AdminEditorialStoryUpdateInput = z.infer<typeof AdminEditorialStoryUpdateSchema>;
