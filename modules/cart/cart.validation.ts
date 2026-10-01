/**
 * VÉRONA — Cart Validation Schemas
 *
 * Zod validation schemas enforcing strict quantity limits, valid MongoDB ObjectIds,
 * and rejecting floating points, string values, or negative numbers.
 */

import { z } from "zod";
import { MAX_CART_ITEM_QUANTITY, MIN_CART_ITEM_QUANTITY } from "@/config/cart";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const AddToCartInputSchema = z.object({
  productId: z
    .string({ required_error: "productId is required" })
    .trim()
    .regex(OBJECT_ID_REGEX, "Invalid productId format"),
  variantId: z
    .string({ required_error: "variantId is required" })
    .trim()
    .regex(OBJECT_ID_REGEX, "Invalid variantId format"),
  quantity: z
    .number({ invalid_type_error: "Quantity must be an integer" })
    .int("Quantity must be an integer")
    .min(MIN_CART_ITEM_QUANTITY, `Quantity must be at least ${MIN_CART_ITEM_QUANTITY}`)
    .max(MAX_CART_ITEM_QUANTITY, `Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}`)
    .default(1),
});

export const UpdateQuantityInputSchema = z.object({
  quantity: z
    .number({ required_error: "quantity is required", invalid_type_error: "Quantity must be an integer" })
    .int("Quantity must be an integer")
    .min(0, "Quantity cannot be negative")
    .max(MAX_CART_ITEM_QUANTITY, `Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}`),
});

export const CartItemParamSchema = z.object({
  itemId: z
    .string({ required_error: "itemId is required" })
    .trim()
    .regex(OBJECT_ID_REGEX, "Invalid itemId format"),
});

export type AddToCartInputType = z.infer<typeof AddToCartInputSchema>;
export type UpdateQuantityInputType = z.infer<typeof UpdateQuantityInputSchema>;
