/**
 * VÉRONA — Phase 09 Product Validation Unit Tests
 *
 * Tests for catalog domain validation schemas, SKU rules, slug normalization, and constraints.
 */

import { describe, it, expect } from "vitest";
import {
  CreateProductInputSchema,
  UpdateProductInputSchema,
  CreateVariantInputSchema,
  UpdateVariantInputSchema,
  ProductListQuerySchema,
} from "@/modules/catalog/catalog.validation";
import { normalizeSlug, isValidSlug } from "@/lib/slug";

describe("Product Catalog Validation (Phase 09)", () => {
  describe("Slug Utility", () => {
    it("normalizes arbitrary strings into valid, deterministic URL slugs", () => {
      expect(normalizeSlug("Classic Oversized Cotton T-Shirt")).toBe(
        "classic-oversized-cotton-t-shirt"
      );
      expect(normalizeSlug("  Atelier Silk & Wool Cape  ")).toBe(
        "atelier-silk-wool-cape"
      );
      expect(normalizeSlug("Special---Dresses   100%")).toBe(
        "special-dresses-100"
      );
    });

    it("validates safe slugs correctly", () => {
      expect(isValidSlug("classic-oversized-t-shirt")).toBe(true);
      expect(isValidSlug("mens-kurta-2026")).toBe(true);
      expect(isValidSlug("Invalid Slug With Spaces")).toBe(false);
      expect(isValidSlug("invalid_with_underscores")).toBe(false);
      expect(isValidSlug("")).toBe(false);
    });
  });

  describe("CreateProductInputSchema", () => {
    const validProduct = {
      name: "Handwoven Silk Blazer",
      slug: "handwoven-silk-blazer",
      description: "Artisanal handwoven mulberry silk structured blazer.",
      productType: "JACKET",
      gender: "MEN",
      brandId: "507f1f77bcf86cd799439011",
      categoryIds: ["507f1f77bcf86cd799439012"],
      collectionIds: ["507f1f77bcf86cd799439013"],
      fabric: "100% Mulberry Silk",
      fit: "Tailored Fit",
      status: "PUBLISHED",
      visibility: "PUBLIC",
      tags: ["silk", "handwoven", "blazer"],
    };

    it("validates a compliant product input successfully", () => {
      const parsed = CreateProductInputSchema.safeParse(validProduct);
      expect(parsed.success).toBe(true);
    });

    it("rejects missing or empty product names", () => {
      const parsed = CreateProductInputSchema.safeParse({
        ...validProduct,
        name: "",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid slugs with uppercase or special characters", () => {
      const parsed = CreateProductInputSchema.safeParse({
        ...validProduct,
        slug: "Invalid Slug!",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid MongoDB ObjectId references", () => {
      const parsed = CreateProductInputSchema.safeParse({
        ...validProduct,
        brandId: "not-an-id",
      });
      expect(parsed.success).toBe(false);
    });

    it("enforces valid status and visibility enum values", () => {
      const parsedStatus = CreateProductInputSchema.safeParse({
        ...validProduct,
        status: "INVALID_STATUS",
      });
      expect(parsedStatus.success).toBe(false);

      const parsedVis = CreateProductInputSchema.safeParse({
        ...validProduct,
        visibility: "INVALID_VISIBILITY",
      });
      expect(parsedVis.success).toBe(false);
    });
  });

  describe("CreateVariantInputSchema", () => {
    const validVariant = {
      sku: "VER-MEN-BLZ-BLK-40",
      size: "40",
      color: {
        name: "Noir Onyx",
        slug: "noir-onyx",
        hexCode: "#111111",
      },
      mrp: 14999,
      sellingPrice: 12999,
      mrpMinor: 1499900,
      sellingPriceMinor: 1299900,
      variantImages: ["/images/blazer-noir-1.jpg"],
      status: "ACTIVE",
    };

    it("validates a correct garment variant payload", () => {
      const parsed = CreateVariantInputSchema.safeParse(validVariant);
      expect(parsed.success).toBe(true);
    });

    it("rejects lowercase or irregular SKUs", () => {
      const parsed = CreateVariantInputSchema.safeParse({
        ...validVariant,
        sku: "ver-men-blz-lower",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects variants where selling price exceeds mrp", () => {
      const parsed = CreateVariantInputSchema.safeParse({
        ...validVariant,
        mrp: 5000,
        sellingPrice: 6000,
        mrpMinor: 500000,
        sellingPriceMinor: 600000,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid hex codes in color structure", () => {
      const parsed = CreateVariantInputSchema.safeParse({
        ...validVariant,
        color: {
          name: "Blue",
          slug: "blue",
          hexCode: "not-a-hex",
        },
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("ProductListQuerySchema", () => {
    it("coerces query params and provides defaults", () => {
      const parsed = ProductListQuerySchema.parse({
        page: "2",
        limit: "24",
        sort: "newest",
      });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(24);
      expect(parsed.sort).toBe("newest");
    });

    it("clamps limit to prevent excessive query attacks", () => {
      const parsed = ProductListQuerySchema.safeParse({
        limit: "100000",
      });
      expect(parsed.success).toBe(false);
    });
  });
});
