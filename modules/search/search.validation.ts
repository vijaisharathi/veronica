/**
 * VÉRONA — Search Validation Schemas
 *
 * Strict Zod validation for search queries, facets, and suggestion requests.
 * Enforces production-safe limits against parameter injection or unbounded queries.
 */

import { z } from "zod";
import { Gender } from "@/constants/status";

export const SearchSortSchema = z.enum([
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
]);

export const SearchQuerySchema = z
  .object({
    q: z.string().max(100, "Query cannot exceed 100 characters").optional(),
    query: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    collection: z.string().max(100).optional(),
    brand: z.string().max(100).optional(),
    gender: z
      .string()
      .toUpperCase()
      .pipe(z.nativeEnum(Gender))
      .optional(),
    color: z.string().max(50).optional(),
    size: z.string().max(30).optional(),
    productType: z.string().max(50).optional(),
    fabric: z.string().max(100).optional(),
    fit: z.string().max(100).optional(),
    pattern: z.string().max(100).optional(),
    occasion: z.string().max(100).optional(),
    minPrice: z.coerce.number().min(0, "Minimum price must be non-negative").optional(),
    maxPrice: z.coerce.number().min(0, "Maximum price must be non-negative").optional(),
    inStock: z
      .union([z.boolean(), z.string().transform((val) => val === "true")])
      .optional(),
    sort: SearchSortSchema.default("relevance"),
    page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(50, "Limit cannot exceed 50")
      .default(20),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: "Minimum price cannot exceed maximum price",
      path: ["minPrice"],
    }
  );

export const SearchSuggestionQuerySchema = z.object({
  q: z
    .string()
    .min(1, "Query is required")
    .max(100, "Query cannot exceed 100 characters"),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type ValidatedSearchQuery = z.infer<typeof SearchQuerySchema>;
export type ValidatedSuggestionQuery = z.infer<typeof SearchSuggestionQuerySchema>;
