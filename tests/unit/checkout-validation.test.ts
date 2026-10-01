import { describe, it, expect } from "vitest";
import {
  SelectCheckoutAddressSchema,
  CheckoutSessionParamsSchema,
  CheckoutIssueCode,
} from "@/modules/checkout";

describe("Phase 17 — Checkout Validation Unit Tests", () => {
  describe("SelectCheckoutAddressSchema", () => {
    it("accepts valid MongoDB ObjectId strings", () => {
      const valid = { addressId: "507f1f77bcf86cd799439011" };
      const parsed = SelectCheckoutAddressSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.addressId).toBe(valid.addressId);
      }
    });

    it("rejects non-hex string or invalid length IDs", () => {
      const invalid = { addressId: "invalid-id" };
      const parsed = SelectCheckoutAddressSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("rejects missing addressId", () => {
      const empty = {};
      const parsed = SelectCheckoutAddressSchema.safeParse(empty);
      expect(parsed.success).toBe(false);
    });
  });

  describe("CheckoutSessionParamsSchema", () => {
    it("accepts valid 24-character hexadecimal ObjectId", () => {
      const valid = { id: "507f1f77bcf86cd799439011" };
      const parsed = CheckoutSessionParamsSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid characters in session ID", () => {
      const invalid = { id: "not-a-valid-session-id!!" };
      const parsed = CheckoutSessionParamsSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("CheckoutIssueCode Taxonomy", () => {
    it("includes all canonical checkout issues", () => {
      expect(CheckoutIssueCode.CART_EMPTY).toBe("CART_EMPTY");
      expect(CheckoutIssueCode.PRODUCT_UNAVAILABLE).toBe("PRODUCT_UNAVAILABLE");
      expect(CheckoutIssueCode.VARIANT_UNAVAILABLE).toBe("VARIANT_UNAVAILABLE");
      expect(CheckoutIssueCode.INVALID_QUANTITY).toBe("INVALID_QUANTITY");
      expect(CheckoutIssueCode.PRICE_CHANGED).toBe("PRICE_CHANGED");
      expect(CheckoutIssueCode.COUPON_INVALID).toBe("COUPON_INVALID");
      expect(CheckoutIssueCode.COUPON_EXPIRED).toBe("COUPON_EXPIRED");
      expect(CheckoutIssueCode.ADDRESS_REQUIRED).toBe("ADDRESS_REQUIRED");
      expect(CheckoutIssueCode.ADDRESS_INVALID).toBe("ADDRESS_INVALID");
      expect(CheckoutIssueCode.DELIVERY_NOT_SERVICEABLE).toBe("DELIVERY_NOT_SERVICEABLE");
      expect(CheckoutIssueCode.SERVICEABILITY_UNAVAILABLE).toBe("SERVICEABILITY_UNAVAILABLE");
      expect(CheckoutIssueCode.CHECKOUT_EXPIRED).toBe("CHECKOUT_EXPIRED");
    });
  });
});
