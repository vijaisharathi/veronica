import { z } from "zod";
import { ProductPreview } from "@/types/storefront";

/**
 * Customer-facing Wishlist item DTO
 */
export interface WishlistItemDto {
  id: string;
  wishlistId: string;
  customerId: string;
  productId: string;
  variantId?: string | null;
  addedAt: string;
  product: ProductPreview;
}

/**
 * Standard Wishlist response contract
 */
export interface WishlistResponse {
  items: WishlistItemDto[];
  count: number;
}

/**
 * Standard Recently Viewed response contract
 */
export interface RecentlyViewedResponse {
  items: ProductPreview[];
  count: number;
}

/**
 * Validation schema for adding an item to wishlist
 */
export const AddToWishlistSchema = z.object({
  productId: z
    .string({ required_error: "Product ID is required" })
    .min(1, "Product ID cannot be empty"),
  variantId: z.string().optional().nullable(),
});

export type AddToWishlistInput = z.infer<typeof AddToWishlistSchema>;

/**
 * Validation schema for recording a recently viewed product
 */
export const RecordRecentlyViewedSchema = z.object({
  productId: z
    .string({ required_error: "Product ID is required" })
    .min(1, "Product ID cannot be empty"),
});

export type RecordRecentlyViewedInput = z.infer<typeof RecordRecentlyViewedSchema>;
