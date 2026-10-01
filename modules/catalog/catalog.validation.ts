/**
 * VÉRONA — Catalog Domain Validation Schemas
 *
 * Strict Zod validation schemas for catalog queries, product creation,
 * variant management, and administrative mutations.
 */

import { z } from "zod";
import { Gender, ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { isValidSlug } from "@/lib/slug";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const ObjectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId format");

export const ProductMediaInputSchema = z.object({
  url: z.string().url("Media URL must be a valid URL"),
  alt: z.string().max(200).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const ProductSpecificationInputSchema = z.object({
  key: z.string().min(1, "Key cannot be empty").max(100),
  value: z.string().min(1, "Value cannot be empty").max(300),
});

export const SeoMetadataInputSchema = z.object({
  title: z.string().max(150).optional(),
  description: z.string().max(300).optional(),
  keywords: z.array(z.string().max(50)).optional(),
});

export const VariantColorInputSchema = z.object({
  name: z.string().min(1, "Color name is required").max(60),
  slug: z.string().min(1, "Color slug is required").max(60),
  hexCode: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color code"),
  secondaryHexCode: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color code")
    .optional(),
});

export const CreateProductInputSchema = z.object({
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name cannot exceed 200 characters")
    .refine((val) => !/<[a-z][\s\S]*>/i.test(val), "HTML tags are not allowed in product name"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(200, "Slug cannot exceed 200 characters")
    .refine(isValidSlug, "Slug must be lowercase alphanumeric characters separated by hyphens"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .refine((val) => !/<script/i.test(val), "Unsafe scripts are not allowed in description"),
  brandId: ObjectIdSchema.optional(),
  categoryIds: z.array(ObjectIdSchema).min(1, "Product must have at least one category"),
  collectionIds: z.array(ObjectIdSchema).optional(),
  gender: z.nativeEnum(Gender),
  productType: z.string().min(1, "Product type is required").max(100),
  fabric: z.string().max(150).optional(),
  fit: z.string().max(100).optional(),
  pattern: z.string().max(100).optional(),
  occasion: z.string().max(100).optional(),
  season: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).default([]),
  images: z.array(ProductMediaInputSchema).default([]),
  careInstructions: z.array(z.string().max(200)).default([]),
  specifications: z.array(ProductSpecificationInputSchema).default([]),
  seo: SeoMetadataInputSchema.optional(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  visibility: z.nativeEnum(ProductVisibility).default(ProductVisibility.PUBLIC),
  featured: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  newArrival: z.boolean().default(false),
});

export const UpdateProductInputSchema = CreateProductInputSchema.partial();

export const BaseVariantInputSchema = z.object({
  productId: ObjectIdSchema.optional(),
  sku: z
    .string()
    .min(3, "SKU must be at least 3 characters")
    .max(50, "SKU cannot exceed 50 characters")
    .regex(/^[A-Z0-9-]+$/, "SKU must contain only uppercase alphanumeric characters and hyphens")
    .optional(),
  barcode: z.string().max(50).optional(),
  color: VariantColorInputSchema,
  size: z.string().min(1, "Size is required").max(30),
  variantImages: z.array(z.string().min(1, "Image URL or path cannot be empty")).default([]),
  priceOverride: z.boolean().default(false),
  mrp: z.number().int().positive("MRP must be a positive integer in minor units (paise)"),
  sellingPrice: z
    .number()
    .int()
    .positive("Selling price must be a positive integer in minor units (paise)"),
  costPrice: z.number().int().positive().optional(),
  weightInGrams: z.number().min(0).optional(),
  dimensions: z
    .object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
    })
    .optional(),
  status: z.nativeEnum(VariantStatus).default(VariantStatus.ACTIVE),
  active: z.boolean().default(true),
});

export const CreateVariantInputSchema = BaseVariantInputSchema.refine(
  (data) => data.sellingPrice <= data.mrp,
  {
    message: "Selling price cannot exceed MRP",
    path: ["sellingPrice"],
  }
);

export const UpdateVariantInputSchema = BaseVariantInputSchema.partial().refine(
  (data) => {
    if (data.sellingPrice && data.mrp) {
      return data.sellingPrice <= data.mrp;
    }
    return true;
  },
  {
    message: "Selling price cannot exceed MRP",
    path: ["sellingPrice"],
  }
);

export const VariantResolutionQuerySchema = z.object({
  color: z.string().min(1, "Color parameter is required"),
  size: z.string().min(1, "Size parameter is required"),
});
export type VariantResolutionQuery = z.infer<typeof VariantResolutionQuerySchema>;


export const ProductListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().optional(),
  collectionId: z.string().optional(),
  categorySlug: z.string().optional(),
  collectionSlug: z.string().optional(),
  brandId: z.string().optional(),
  brandSlug: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  productType: z.string().optional(),
  tag: z.string().optional(),
  newArrival: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => (val === true || val === "true" ? true : val === false || val === "false" ? false : undefined)),
  featured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => (val === true || val === "true" ? true : val === false || val === "false" ? false : undefined)),
  bestseller: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => (val === true || val === "true" ? true : val === false || val === "false" ? false : undefined)),
  sale: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => (val === true || val === "true" ? true : val === false || val === "false" ? false : undefined)),
  sort: z.enum(["newest", "price-low", "price-high", "recommended"]).optional().default("recommended"),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
export type CreateVariantInput = z.infer<typeof CreateVariantInputSchema>;
export type UpdateVariantInput = z.infer<typeof UpdateVariantInputSchema>;
export type ProductListParams = z.infer<typeof ProductListQuerySchema>;
