import { describe, it, expect } from "vitest";
import {
  AddToCartInputSchema,
  UpdateQuantityInputSchema,
  CartItemParamSchema,
} from "@/modules/cart/cart.validation";
import { MAX_CART_ITEM_QUANTITY, MIN_CART_ITEM_QUANTITY } from "@/config/cart";

describe("Phase 14 — Cart Validation Schemas Unit Tests", () => {
  const validProductId = "507f1f77bcf86cd799439011";
  const validVariantId = "507f191e810c19729de860ea";
  const validItemId = "507f191e810c19729de860eb";

  describe("AddToCartInputSchema", () => {
    it("should accept valid add to cart input", () => {
      const valid = {
        productId: validProductId,
        variantId: validVariantId,
        quantity: 2,
      };

      const result = AddToCartInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(2);
        expect(result.data.productId).toBe(validProductId);
        expect(result.data.variantId).toBe(validVariantId);
      }
    });

    it("should default quantity to 1 when omitted", () => {
      const input = {
        productId: validProductId,
        variantId: validVariantId,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
      }
    });

    it("should reject non-24-hex-character productId", () => {
      const input = {
        productId: "invalid-id-format",
        variantId: validVariantId,
        quantity: 1,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain("Invalid productId format");
      }
    });

    it("should reject non-24-hex-character variantId", () => {
      const input = {
        productId: validProductId,
        variantId: "not-an-objectid",
        quantity: 1,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain("Invalid variantId format");
      }
    });

    it("should reject quantity less than MIN_CART_ITEM_QUANTITY", () => {
      const input = {
        productId: validProductId,
        variantId: validVariantId,
        quantity: 0,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain(`Quantity must be at least ${MIN_CART_ITEM_QUANTITY}`);
      }
    });

    it("should reject negative quantity", () => {
      const input = {
        productId: validProductId,
        variantId: validVariantId,
        quantity: -3,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject floating-point quantity", () => {
      const input = {
        productId: validProductId,
        variantId: validVariantId,
        quantity: 1.5,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain("Quantity must be an integer");
      }
    });

    it("should reject quantity greater than MAX_CART_ITEM_QUANTITY", () => {
      const input = {
        productId: validProductId,
        variantId: validVariantId,
        quantity: MAX_CART_ITEM_QUANTITY + 1,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain(`Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}`);
      }
    });

    it("should reject string quantity", () => {
      const input = {
        productId: validProductId,
        variantId: validVariantId,
        quantity: "2" as unknown as number,
      };

      const result = AddToCartInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateQuantityInputSchema", () => {
    it("should accept valid integer quantity within bounds", () => {
      const result = UpdateQuantityInputSchema.safeParse({ quantity: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(5);
      }
    });

    it("should accept quantity = 0 (representing item removal)", () => {
      const result = UpdateQuantityInputSchema.safeParse({ quantity: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(0);
      }
    });

    it("should reject negative quantity", () => {
      const result = UpdateQuantityInputSchema.safeParse({ quantity: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain("Quantity cannot be negative");
      }
    });

    it("should reject decimal quantity", () => {
      const result = UpdateQuantityInputSchema.safeParse({ quantity: 2.75 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain("Quantity must be an integer");
      }
    });

    it("should reject quantity exceeding maximum limit", () => {
      const result = UpdateQuantityInputSchema.safeParse({
        quantity: MAX_CART_ITEM_QUANTITY + 5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain(`Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}`);
      }
    });
  });

  describe("CartItemParamSchema", () => {
    it("should accept valid 24 hex char itemId", () => {
      const result = CartItemParamSchema.safeParse({ itemId: validItemId });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.itemId).toBe(validItemId);
      }
    });

    it("should reject malformed itemId", () => {
      const result = CartItemParamSchema.safeParse({ itemId: "not-hex-id-123" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]!.message).toContain("Invalid itemId format");
      }
    });
  });
});
