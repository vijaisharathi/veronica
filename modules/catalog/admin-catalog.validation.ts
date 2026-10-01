/**
 * VÉRONA — Admin Catalog Validation Schemas (Phase 28)
 */

import { z } from "zod";
import { Gender, ProductStatus, ProductVisibility } from "@/constants/status";

export const AdminProductListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  visibility: z.nativeEnum(ProductVisibility).optional(),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  gender: z.nativeEnum(Gender).optional(),
  productType: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminProductListQueryParams = z.infer<typeof AdminProductListQuerySchema>;

export const AdminBulkProductActionSchema = z.object({
  action: z.enum(["PUBLISH", "UNPUBLISH", "ARCHIVE", "SET_STATUS"]),
  productIds: z.array(z.string().min(1)).min(1, "At least one product ID is required").max(50, "Batch limit is 50 items"),
  status: z.nativeEnum(ProductStatus).optional(),
});

export type AdminBulkProductActionInput = z.infer<typeof AdminBulkProductActionSchema>;

export const AdminCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z.string().trim().nullable().optional(),
  gender: z.nativeEnum(Gender),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  banner: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  seo: z.object({
    title: z.string().trim().max(150).optional(),
    description: z.string().trim().max(300).optional(),
    keywords: z.array(z.string().trim()).optional(),
  }).optional(),
});

export type AdminCategoryCreateInput = z.infer<typeof AdminCategoryCreateSchema>;

export const AdminCategoryUpdateSchema = AdminCategoryCreateSchema.partial();
export type AdminCategoryUpdateInput = z.infer<typeof AdminCategoryUpdateSchema>;

export const AdminCategoryReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, "At least one category ID required"),
});

export const AdminCollectionCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  slug: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1000).optional(),
  heroImage: z.string().url("Hero image must be a valid URL").optional().or(z.literal("")).default(""),
  banner: z.string().url("Banner must be a valid URL").optional().or(z.literal("")),
  productIds: z.array(z.string().trim()).default([]),
  categoryIds: z.array(z.string().trim()).default([]),
  active: z.boolean().default(true),
  startDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  endDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  sortOrder: z.coerce.number().int().default(0),
  seo: z.object({
    title: z.string().trim().max(150).optional(),
    description: z.string().trim().max(300).optional(),
    keywords: z.array(z.string().trim()).optional(),
  }).optional(),
});

export type AdminCollectionCreateInput = z.input<typeof AdminCollectionCreateSchema>;

export const AdminCollectionUpdateSchema = AdminCollectionCreateSchema.partial();
export type AdminCollectionUpdateInput = z.infer<typeof AdminCollectionUpdateSchema>;

export const AdminBrandCreateSchema = z.object({
  name: z.string().trim().min(2, "Brand name must be at least 2 characters").max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  logo: z.string().url("Logo must be a valid URL").optional().or(z.literal("")).default(""),
  banner: z.string().url("Banner must be a valid URL").optional().or(z.literal("")),
  website: z.string().url("Website must be a valid URL").optional().or(z.literal("")),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  seo: z.object({
    title: z.string().trim().max(150).optional(),
    description: z.string().trim().max(300).optional(),
    keywords: z.array(z.string().trim()).optional(),
  }).optional(),
});

export type AdminBrandCreateInput = z.input<typeof AdminBrandCreateSchema>;

export const AdminBrandUpdateSchema = AdminBrandCreateSchema.partial();
export type AdminBrandUpdateInput = z.infer<typeof AdminBrandUpdateSchema>;

export { CreateProductInputSchema as AdminProductCreateSchema } from "./catalog.validation";
