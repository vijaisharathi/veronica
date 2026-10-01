/**
 * VÉRONA — Garment Variant & Size Domain Unit Test Suite
 *
 * Verifies Phase 12 business logic:
 * - Color normalization and swatch definitions
 * - Size schemes, display labels, and deterministic ordering
 * - Collision-resistant deterministic SKU generation and validation
 * - Availability Matrix (Color x Size) generation
 * - Exact variant resolution and strict invalid combination rejection (no arbitrary fallbacks)
 * - Product archetype variant dimensions rules
 */

import { describe, it, expect } from "vitest";
import { variantService } from "@/modules/catalog/variant.service";
import { SizeScheme, VariantDimensionType } from "@/modules/catalog/variant.types";
import { ProductVariantDTO } from "@/modules/catalog/product.dto";
import { VariantStatus } from "@/constants/status";

describe("Garment Variant & Size System — Unit Test Suite", () => {
  // -----------------------------------------------------------
  // 1. Color Domain & Normalization
  // -----------------------------------------------------------
  describe("Color Domain & Normalization", () => {
    it("should normalize color names to canonical title case", () => {
      expect(variantService.normalizeColorName("obsidian black")).toBe("Obsidian Black");
      expect(variantService.normalizeColorName("IVORY PEARL")).toBe("Ivory Pearl");
      expect(variantService.normalizeColorName("  sage   green  ")).toBe("Sage Green");
      expect(variantService.normalizeColorName("")).toBe("");
    });

    it("should normalize color slugs to lowercase kebab-case", () => {
      expect(variantService.normalizeColorSlug("Obsidian Black")).toBe("obsidian-black");
      expect(variantService.normalizeColorSlug("Sage Green / Dual Tone")).toBe("sage-green-dual-tone");
      expect(variantService.normalizeColorSlug("PEARL_WHITE")).toBe("pearl-white");
    });

    it("should normalize hex color codes to uppercase 6-character strings with # prefix", () => {
      expect(variantService.normalizeHexCode("#fff")).toBe("#FFFFFF");
      expect(variantService.normalizeHexCode("111111")).toBe("#111111");
      expect(variantService.normalizeHexCode("#2b2b2b")).toBe("#2B2B2B");
    });
  });

  // -----------------------------------------------------------
  // 2. Size Domain & Deterministic Ordering
  // -----------------------------------------------------------
  describe("Size Domain & Deterministic Ordering", () => {
    it("should correctly detect sizing schemes across apparel archetypes", () => {
      expect(variantService.detectSizeScheme("XS")).toBe(SizeScheme.LETTER);
      expect(variantService.detectSizeScheme("M")).toBe(SizeScheme.LETTER);
      expect(variantService.detectSizeScheme("32")).toBe(SizeScheme.NUMERIC);
      expect(variantService.detectSizeScheme("32W")).toBe(SizeScheme.WAIST);
      expect(variantService.detectSizeScheme("4-5Y")).toBe(SizeScheme.AGE);
      expect(variantService.detectSizeScheme("ONE_SIZE")).toBe(SizeScheme.ONE_SIZE);
      expect(variantService.detectSizeScheme("One Size")).toBe(SizeScheme.ONE_SIZE);
      expect(variantService.detectSizeScheme("Free Size")).toBe(SizeScheme.ONE_SIZE);
      expect(variantService.detectSizeScheme("OS")).toBe(SizeScheme.ONE_SIZE);
    });

    it("should format customer-facing display labels cleanly", () => {
      expect(variantService.getSizeDisplayLabel("ONE_SIZE")).toBe("One Size");
      expect(variantService.getSizeDisplayLabel("FREE_SIZE")).toBe("Free Size");
      expect(variantService.getSizeDisplayLabel("m")).toBe("M");
      expect(variantService.getSizeDisplayLabel("32w")).toBe("32W");
    });

    it("should deterministically sort letter sizes regardless of insertion order", () => {
      const unsorted = ["XXL", "XS", "L", "S", "M", "XL", "XXS", "3XL"];
      const sorted = variantService.sortSizes(unsorted);

      expect(sorted).toEqual(["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"]);
    });

    it("should deterministically sort numeric waist sizes in ascending numerical order", () => {
      const unsorted = ["36", "28", "34", "30", "32"];
      const sorted = variantService.sortSizes(unsorted);

      expect(sorted).toEqual(["28", "30", "32", "34", "36"]);
    });

    it("should place ONE_SIZE at the deterministic end for multi-scheme lists", () => {
      const unsorted = ["L", "ONE_SIZE", "S", "M"];
      const sorted = variantService.sortSizes(unsorted);

      expect(sorted).toEqual(["S", "M", "L", "ONE_SIZE"]);
    });
  });

  // -----------------------------------------------------------
  // 3. SKU Strategy & Deterministic Generation
  // -----------------------------------------------------------
  describe("SKU Strategy & Validation", () => {
    it("should deterministically generate clean, collision-resistant SKUs", () => {
      const sku = variantService.generateSku({
        productSlugOrType: "heavyweight-supima-cotton-tee",
        colorSlugOrName: "obsidian-black",
        size: "M",
      });

      expect(sku).toBe("VER-HESUCO-BLK-M");
      expect(variantService.validateSku(sku)).toBe(true);
    });

    it("should generate proper SKU for numeric and one-size products", () => {
      const jeansSku = variantService.generateSku({
        productSlugOrType: "raw-selvedge-jeans",
        colorSlugOrName: "raw-indigo",
        size: "32",
      });
      expect(jeansSku).toBe("VER-RASEJE-IND-32");

      const scarfSku = variantService.generateSku({
        productSlugOrType: "silk-scarf",
        colorSlugOrName: "pearl-white",
        size: "ONE_SIZE",
      });
      expect(scarfSku).toBe("VER-SISC-PRL-OS");
    });

    it("should validate and reject invalid SKU strings", () => {
      expect(variantService.validateSku("VER-TS-BLK-M")).toBe(true);
      expect(variantService.validateSku("VER123")).toBe(true);
      expect(variantService.validateSku("V")).toBe(false); // too short
      expect(variantService.validateSku("SKU with spaces")).toBe(false);
      expect(variantService.validateSku("SKU_WITH_UNDERSCORE")).toBe(false);
      expect(variantService.validateSku("SKU@SPECIAL!")).toBe(false);
    });
  });

  // -----------------------------------------------------------
  // 4. Availability Matrix Builder & Cross-Availability
  // -----------------------------------------------------------
  describe("Availability Matrix Builder", () => {
    const mockVariants: ProductVariantDTO[] = [
      {
        id: "v1",
        productId: "p1",
        sku: "VER-TEE-BLK-S",
        color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
        size: "S",
        variantImages: ["/img/black-front.jpg"],
        sellingPrice: 1999,
        mrp: 2499,
        sellingPriceMinor: 199900,
        mrpMinor: 249900,
        discountPercent: 20,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      },
      {
        id: "v2",
        productId: "p1",
        sku: "VER-TEE-BLK-M",
        color: { name: "Obsidian Black", slug: "obsidian-black", hexCode: "#111111" },
        size: "M",
        variantImages: ["/img/black-front.jpg"],
        sellingPrice: 1999,
        mrp: 2499,
        sellingPriceMinor: 199900,
        mrpMinor: 249900,
        discountPercent: 20,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      },
      {
        id: "v3",
        productId: "p1",
        sku: "VER-TEE-WHT-M",
        color: { name: "Ivory Pearl", slug: "ivory-pearl", hexCode: "#F9F6F0" },
        size: "M",
        variantImages: ["/img/white-front.jpg"],
        sellingPrice: 1999,
        mrp: 2499,
        sellingPriceMinor: 199900,
        mrpMinor: 249900,
        discountPercent: 20,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      },
      // Note: Ivory Pearl S does not exist in catalog
      {
        id: "v4",
        productId: "p1",
        sku: "VER-TEE-WHT-L",
        color: { name: "Ivory Pearl", slug: "ivory-pearl", hexCode: "#F9F6F0" },
        size: "L",
        variantImages: ["/img/white-front.jpg"],
        sellingPrice: 1999,
        mrp: 2499,
        sellingPriceMinor: 199900,
        mrpMinor: 249900,
        discountPercent: 20,
        status: VariantStatus.ACTIVE,
        active: true,
        available: false, // Out of stock test
      },
    ];

    it("should build structured Color x Size matrix with accurate cross-availability", () => {
      const matrix = variantService.buildVariantMatrix(mockVariants);

      expect(matrix.colors.length).toBe(2);
      expect(matrix.sizes.map((s) => s.code)).toEqual(["S", "M", "L"]);

      // Obsidian Black supports S & M
      expect(matrix.colorToSizes["obsidian-black"]).toEqual(["S", "M"]);

      // Ivory Pearl supports M (available) and L (out of stock)
      expect(matrix.colorToSizes["ivory-pearl"]).toEqual(["M"]);

      // Size S is only available in Obsidian Black
      expect(matrix.sizeToColors["S"]).toEqual(["obsidian-black"]);

      // Size M is available in both Black & White
      expect(matrix.sizeToColors["M"]).toEqual(["obsidian-black", "ivory-pearl"]);
    });

    it("should provide instant O(1) combination lookup in matrix", () => {
      const matrix = variantService.buildVariantMatrix(mockVariants);

      // Black + S exists and is available
      const blackS = matrix.combinations["obsidian-black:S"];
      expect(blackS).toBeDefined();
      expect(blackS?.exists).toBe(true);
      expect(blackS?.available).toBe(true);
      expect(blackS?.sku).toBe("VER-TEE-BLK-S");

      // White + S does not exist
      const whiteS = matrix.combinations["ivory-pearl:S"];
      expect(whiteS).toBeUndefined();

      // White + L exists but is out of stock (available: false)
      const whiteL = matrix.combinations["ivory-pearl:L"];
      expect(whiteL).toBeDefined();
      expect(whiteL?.exists).toBe(true);
      expect(whiteL?.available).toBe(false);
    });

    it("should calculate deterministic default selection", () => {
      const matrix = variantService.buildVariantMatrix(mockVariants);

      expect(matrix.defaultSelection).not.toBeNull();
      expect(matrix.defaultSelection?.colorSlug).toBe("obsidian-black");
      expect(matrix.defaultSelection?.size).toBe("S");
      expect(matrix.defaultSelection?.sku).toBe("VER-TEE-BLK-S");
    });
  });

  // -----------------------------------------------------------
  // 5. Canonical Variant Resolution (Section 16, 17, 18, 19)
  // -----------------------------------------------------------
  describe("Variant Resolution Algorithm", () => {
    const mockVariants: ProductVariantDTO[] = [
      {
        id: "v1",
        productId: "p1",
        sku: "VER-TS-BLK-S",
        color: { name: "Black", slug: "black", hexCode: "#000000" },
        size: "S",
        variantImages: ["/img/black-s.jpg"],
        sellingPrice: 1500,
        mrp: 2000,
        sellingPriceMinor: 150000,
        mrpMinor: 200000,
        discountPercent: 25,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      },
      {
        id: "v2",
        productId: "p1",
        sku: "VER-TS-BLK-M",
        color: { name: "Black", slug: "black", hexCode: "#000000" },
        size: "M",
        variantImages: ["/img/black-m.jpg"],
        sellingPrice: 1500,
        mrp: 2000,
        sellingPriceMinor: 150000,
        mrpMinor: 200000,
        discountPercent: 25,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      },
      {
        id: "v3",
        productId: "p1",
        sku: "VER-TS-WHT-M",
        color: { name: "White", slug: "white", hexCode: "#FFFFFF" },
        size: "M",
        variantImages: ["/img/white-m.jpg"],
        sellingPrice: 1600, // Price override test
        mrp: 2000,
        sellingPriceMinor: 160000,
        mrpMinor: 200000,
        discountPercent: 20,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      },
      {
        id: "v4",
        productId: "p1",
        sku: "VER-TS-WHT-L",
        color: { name: "White", slug: "white", hexCode: "#FFFFFF" },
        size: "L",
        variantImages: ["/img/white-l.jpg"],
        sellingPrice: 1600,
        mrp: 2000,
        sellingPriceMinor: 160000,
        mrpMinor: 200000,
        discountPercent: 20,
        status: VariantStatus.INACTIVE, // Inactive variant test
        active: false,
        available: false,
      },
    ];

    it("should resolve Black + S to exact variant v1", () => {
      const res = variantService.resolveVariant({
        color: "Black",
        size: "S",
        variants: mockVariants,
      });

      expect(res.status).toBe("RESOLVED");
      expect(res.variant?.id).toBe("v1");
      expect(res.sku).toBe("VER-TS-BLK-S");
      expect(res.isAvailable).toBe(true);
      expect(res.price?.sellingPrice).toBe(1500);
    });

    it("should resolve White + M with variant-specific price override", () => {
      const res = variantService.resolveVariant({
        color: "White",
        size: "M",
        variants: mockVariants,
      });

      expect(res.status).toBe("RESOLVED");
      expect(res.variant?.id).toBe("v3");
      expect(res.sku).toBe("VER-TS-WHT-M");
      expect(res.isAvailable).toBe(true);
      expect(res.price?.sellingPrice).toBe(1600);
      expect(res.media).toEqual(["/img/white-m.jpg"]);
    });

    it("STRICT: should reject White + S as INVALID_COMBINATION without arbitrary fallback", () => {
      const res = variantService.resolveVariant({
        color: "White",
        size: "S",
        variants: mockVariants,
      });

      // Must NOT return Black + S or White + M
      expect(res.status).toBe("INVALID_COMBINATION");
      expect(res.variant).toBeNull();
      expect(res.isAvailable).toBe(false);
      expect(res.message).toContain("Size 'S' is unavailable in 'White'");
    });

    it("should report UNAVAILABLE for inactive variant White + L", () => {
      const res = variantService.resolveVariant({
        color: "White",
        size: "L",
        variants: mockVariants,
      });

      expect(res.status).toBe("UNAVAILABLE");
      expect(res.isAvailable).toBe(false);
      expect(res.variant?.id).toBe("v4");
      expect(res.message).toBe("This combination is currently out of stock.");
    });

    it("should require both color and size for resolution", () => {
      const noColor = variantService.resolveVariant({
        color: "",
        size: "M",
        variants: mockVariants,
      });
      expect(noColor.status).toBe("NO_SELECTION");
      expect(noColor.message).toBe("Please select a color");

      const noSize = variantService.resolveVariant({
        color: "Black",
        size: "",
        variants: mockVariants,
      });
      expect(noSize.status).toBe("NO_SELECTION");
      expect(noSize.message).toBe("Please select a size");
    });
  });

  // -----------------------------------------------------------
  // 6. Product Archetype & Dimensions Rules
  // -----------------------------------------------------------
  describe("Product Archetype Dimensions Rules", () => {
    it("should recognize standard apparel as COLOR_AND_SIZE", () => {
      const apparelVariants: ProductVariantDTO[] = [
        {
          id: "v1",
          productId: "p1",
          sku: "V1",
          color: { name: "Black", slug: "black", hexCode: "#000" },
          size: "S",
          variantImages: [],
          sellingPrice: 1000,
          mrp: 1200,
          sellingPriceMinor: 100000,
          mrpMinor: 120000,
          discountPercent: 17,
          status: VariantStatus.ACTIVE,
          active: true,
          available: true,
        },
        {
          id: "v2",
          productId: "p1",
          sku: "V2",
          color: { name: "Black", slug: "black", hexCode: "#000" },
          size: "M",
          variantImages: [],
          sellingPrice: 1000,
          mrp: 1200,
          sellingPriceMinor: 100000,
          mrpMinor: 120000,
          discountPercent: 17,
          status: VariantStatus.ACTIVE,
          active: true,
          available: true,
        },
        {
          id: "v3",
          productId: "p1",
          sku: "V3",
          color: { name: "White", slug: "white", hexCode: "#FFF" },
          size: "M",
          variantImages: [],
          sellingPrice: 1000,
          mrp: 1200,
          sellingPriceMinor: 100000,
          mrpMinor: 120000,
          discountPercent: 17,
          status: VariantStatus.ACTIVE,
          active: true,
          available: true,
        },
      ];

      const dimensions = variantService.getProductVariantDimensions("Shirt", apparelVariants);
      expect(dimensions.dimensionType).toBe(VariantDimensionType.COLOR_AND_SIZE);
      expect(dimensions.requiresColor).toBe(true);
      expect(dimensions.requiresSize).toBe(true);
      expect(dimensions.isSingleVariant).toBe(false);
    });

    it("should recognize accessories with only ONE_SIZE as COLOR_ONLY", () => {
      const handbagVariants: ProductVariantDTO[] = [
        {
          id: "v1",
          productId: "p1",
          sku: "V1",
          color: { name: "Noir", slug: "noir", hexCode: "#000" },
          size: "ONE_SIZE",
          variantImages: [],
          sellingPrice: 5000,
          mrp: 6000,
          sellingPriceMinor: 500000,
          mrpMinor: 600000,
          discountPercent: 17,
          status: VariantStatus.ACTIVE,
          active: true,
          available: true,
        },
        {
          id: "v2",
          productId: "p1",
          sku: "V2",
          color: { name: "Cognac", slug: "cognac", hexCode: "#9A5B2D" },
          size: "ONE_SIZE",
          variantImages: [],
          sellingPrice: 5000,
          mrp: 6000,
          sellingPriceMinor: 500000,
          mrpMinor: 600000,
          discountPercent: 17,
          status: VariantStatus.ACTIVE,
          active: true,
          available: true,
        },
      ];

      const dimensions = variantService.getProductVariantDimensions("Handbag", handbagVariants);
      expect(dimensions.dimensionType).toBe(VariantDimensionType.COLOR_ONLY);
      expect(dimensions.requiresColor).toBe(true);
      expect(dimensions.requiresSize).toBe(false);
    });

    it("should recognize single-variant products without requiring redundant selection steps", () => {
      const singleVariant: ProductVariantDTO[] = [
        {
          id: "v1",
          productId: "p1",
          sku: "V1",
          color: { name: "Gold", slug: "gold", hexCode: "#FFD700" },
          size: "ONE_SIZE",
          variantImages: [],
          sellingPrice: 15000,
          mrp: 18000,
          sellingPriceMinor: 1500000,
          mrpMinor: 1800000,
          discountPercent: 17,
          status: VariantStatus.ACTIVE,
          active: true,
          available: true,
        },
      ];

      const dimensions = variantService.getProductVariantDimensions("Jewelry", singleVariant);
      expect(dimensions.dimensionType).toBe(VariantDimensionType.SINGLE_VARIANT);
      expect(dimensions.isSingleVariant).toBe(true);
      expect(dimensions.requiresColor).toBe(false);
      expect(dimensions.requiresSize).toBe(false);
    });
  });
});
