/**
 * VÉRONA — Garment Variant & Size Domain Service
 *
 * Core domain service for Phase 12 (Garment Variant & Size System).
 * Provides deterministic SKU generation, color normalization, size ordering,
 * Color x Size matrix generation, and canonical variant resolution.
 */

import { normalizeSlug } from "@/lib/slug";
import { ProductVariantDTO } from "./product.dto";
import {
  CanonicalColor,
  CanonicalSize,
  ResolvedVariantResult,
  SizeScheme,
  VariantDimensionsScheme,
  VariantDimensionType,
  VariantMatrix,
  VariantMatrixCell,
} from "./variant.types";

/**
 * Standard letter size sorting priority table.
 */
const LETTER_SIZE_ORDER: Record<string, number> = {
  "4XS": 0,
  "3XS": 1,
  "XXXS": 1,
  "2XS": 2,
  "XXS": 2,
  XS: 3,
  S: 4,
  M: 5,
  L: 6,
  XL: 7,
  "2XL": 8,
  XXL: 8,
  "3XL": 9,
  XXXL: 9,
  "4XL": 10,
  XXXXL: 10,
  "5XL": 11,
};

/**
 * Color abbreviation dictionary for deterministic SKU generation.
 */
const COLOR_CODE_MAP: Record<string, string> = {
  black: "BLK",
  obsidian: "OBS",
  "obsidian-black": "BLK",
  white: "WHT",
  pearl: "PRL",
  "pearl-white": "PRL",
  "ivory-pearl": "IVR",
  ivory: "IVR",
  blue: "BLU",
  navy: "NVY",
  indigo: "IND",
  green: "GRN",
  sage: "SGE",
  "sage-green": "SGE",
  red: "RED",
  crimson: "CRM",
  maroon: "MRN",
  beige: "BGE",
  cream: "CRM",
  grey: "GRY",
  gray: "GRY",
  charcoal: "CHR",
  brown: "BRN",
  tan: "TAN",
  gold: "GLD",
  silver: "SLV",
  pink: "PNK",
  rose: "ROS",
  yellow: "YLW",
  olive: "OLV",
  terracotta: "TER",
};

export class VariantService {
  // -------------------------------------------------------------
  // COLOR UTILITIES & NORMALIZATION
  // -------------------------------------------------------------

  /**
   * Normalize customer or admin color name to title case.
   * e.g., "obsidian black" -> "Obsidian Black"
   */
  public normalizeColorName(name: string): string {
    if (!name) return "";
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Normalize color slug to lowercase alphanumeric-kebab.
   * e.g., "Obsidian Black" -> "obsidian-black", "PEARL_WHITE" -> "pearl-white"
   */
  public normalizeColorSlug(nameOrSlug: string): string {
    if (!nameOrSlug) return "";
    return normalizeSlug(nameOrSlug.replace(/_/g, " "));
  }


  /**
   * Normalize hex color string.
   * e.g., "#fff" -> "#FFFFFF" or "111111" -> "#111111"
   */
  public normalizeHexCode(hex: string): string {
    let clean = hex.trim().replace(/^#/, "").toUpperCase();
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return `#${clean}`;
  }

  // -------------------------------------------------------------
  // SIZE UTILITIES & DETERMINISTIC ORDERING
  // -------------------------------------------------------------

  /**
   * Detects the sizing scheme for a given size label.
   */
  public detectSizeScheme(size: string): SizeScheme {
    const s = size.trim().toUpperCase();
    if (/^(ONE[ _]?SIZE|FREE[ _]?SIZE|OS|FS)$/i.test(s)) {
      return SizeScheme.ONE_SIZE;
    }
    if (/^\d+-\d+Y$/i.test(s) || /^\d+Y$/i.test(s)) {
      return SizeScheme.AGE;
    }
    if (/^\d+W$/i.test(s)) {
      return SizeScheme.WAIST;
    }
    if (/^\d+$/i.test(s)) {
      return SizeScheme.NUMERIC;
    }
    return SizeScheme.LETTER;
  }

  /**
   * Format customer-facing display label for size.
   */
  public getSizeDisplayLabel(size: string): string {
    const s = size.trim();
    if (/^(ONE[ _]?SIZE|OS)$/i.test(s)) {
      return "One Size";
    }
    if (/^(FREE[ _]?SIZE|FS)$/i.test(s)) {
      return "Free Size";
    }
    return s.toUpperCase();
  }

  /**
   * Generates a deterministic sort integer for size codes.
   * Ensures sizes appear in proper ergonomic fashion order (XS -> S -> M -> L -> XL)
   * rather than database insertion order or random order.
   */
  public getSizeSortOrder(size: string): number {
    const s = size.trim().toUpperCase();

    // Check letter sizes first
    if (s in LETTER_SIZE_ORDER) {
      return LETTER_SIZE_ORDER[s]!;
    }

    // Waist sizes (e.g. 28W, 30W, 32W)
    if (/^\d+W$/i.test(s)) {
      const num = parseInt(s, 10);
      return 1000 + num;
    }

    // Numeric garment/shoe sizes (e.g. 28, 30, 32, 34, 36)
    if (/^\d+$/.test(s)) {
      const num = parseInt(s, 10);
      return 2000 + num;
    }

    // Age-based kid sizes (e.g. 2-3Y, 4-5Y, 6-7Y)
    if (/^\d+-\d+Y$/i.test(s)) {
      const startAge = parseInt(s.split("-")[0] || "0", 10);
      return 3000 + startAge;
    }

    // One-size / Free size placed at the end or standalone
    if (/^(ONE[ _]?SIZE|FREE[ _]?SIZE|OS|FS)$/i.test(s)) {
      return 5000;
    }

    // Fallback alphabetical offset
    return 4000 + s.charCodeAt(0);
  }

  /**
   * Sorts size strings deterministically.
   */
  public sortSizes(sizes: string[]): string[] {
    return [...sizes].sort((a, b) => this.getSizeSortOrder(a) - this.getSizeSortOrder(b));
  }

  // -------------------------------------------------------------
  // DETERMINISTIC SKU GENERATION & PREVIEW
  // -------------------------------------------------------------

  /**
   * Generates a deterministic, collision-resistant SKU for a garment variant.
   * Format: VER-[PRODUCT_PREFIX]-[COLOR_PREFIX]-[SIZE]
   *
   * Example:
   * Product: "heavyweight-supima-cotton-tee"
   * Color: "obsidian-black"
   * Size: "M"
   * -> "VER-HEAVY-BLK-M"
   */
  public generateSku(params: {
    productSlugOrType: string;
    colorSlugOrName: string;
    size: string;
  }): string {
    const prodSlug = normalizeSlug(params.productSlugOrType);
    const colorSlug = normalizeSlug(params.colorSlugOrName);
    const sizeNorm = params.size.trim().toUpperCase().replace(/\s+/g, "");

    // Extract 3-5 character uppercase product prefix
    const prodWords = prodSlug.split("-").filter(Boolean);
    let prodPrefix = "PRD";
    if (prodWords.length >= 2) {
      prodPrefix = prodWords
        .slice(0, 3)
        .map((w) => w.slice(0, 2).toUpperCase())
        .join("");
    } else if (prodWords[0]) {
      prodPrefix = prodWords[0].slice(0, 4).toUpperCase();
    }

    // Extract 3-character uppercase color code
    let colorCode = COLOR_CODE_MAP[colorSlug];
    if (!colorCode) {
      const parts = colorSlug.split("-");
      if (parts.length > 1 && parts[parts.length - 1] && COLOR_CODE_MAP[parts[parts.length - 1]!]) {
        colorCode = COLOR_CODE_MAP[parts[parts.length - 1]!];
      } else {
        colorCode = colorSlug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
      }
    }

    // Size normalization for SKU
    let sizeCode = sizeNorm;
    if (/^(ONE[ _]?SIZE|OS)$/i.test(sizeNorm)) {
      sizeCode = "OS";
    } else if (/^(FREE[ _]?SIZE|FS)$/i.test(sizeNorm)) {
      sizeCode = "FS";
    }

    const sku = `VER-${prodPrefix}-${colorCode}-${sizeCode}`.toUpperCase();
    return sku.replace(/[^A-Z0-9-]/g, "");
  }

  /**
   * Validates SKU format compliance.
   */
  public validateSku(sku: string): boolean {
    if (!sku || typeof sku !== "string") return false;
    return /^[A-Z0-9-]{3,50}$/.test(sku.trim().toUpperCase());
  }

  // -------------------------------------------------------------
  // VARIANT AVAILABILITY MATRIX
  // -------------------------------------------------------------

  /**
   * Builds the Color x Size availability matrix for a product.
   * Provides O(1) lookups for PDP, mobile bottom-sheets, and API endpoints.
   */
  public buildVariantMatrix(variants: ProductVariantDTO[]): VariantMatrix {
    const activeVariants = variants.filter((v) => v.active);

    // 1. Extract and canonicalize unique colors
    const colorMap = new Map<string, CanonicalColor>();
    for (const v of variants) {
      if (!v.color || !v.color.name) continue;
      const slug = this.normalizeColorSlug(v.color.slug || v.color.name);
      if (!colorMap.has(slug)) {
        colorMap.set(slug, {
          name: this.normalizeColorName(v.color.name),
          slug,
          hexCode: this.normalizeHexCode(v.color.hexCode || "#111111"),
          secondaryHexCode: v.color.secondaryHexCode
            ? this.normalizeHexCode(v.color.secondaryHexCode)
            : undefined,
          swatchImage: v.variantImages?.[0],
          displayOrder: colorMap.size + 1,
          active: v.active,
          hasActiveVariants: v.active && v.available,
        });
      } else {
        const existing = colorMap.get(slug)!;
        if (v.active && v.available) {
          existing.hasActiveVariants = true;
        }
      }
    }
    const colors = Array.from(colorMap.values());

    // 2. Extract and canonicalize unique sizes with deterministic ordering
    const sizeMap = new Map<string, CanonicalSize>();
    for (const v of variants) {
      if (!v.size) continue;
      const code = v.size.trim().toUpperCase();
      if (!sizeMap.has(code)) {
        sizeMap.set(code, {
          code,
          label: this.getSizeDisplayLabel(code),
          scheme: this.detectSizeScheme(code),
          sortOrder: this.getSizeSortOrder(code),
          hasActiveVariants: v.active && v.available,
        });
      } else {
        const existing = sizeMap.get(code)!;
        if (v.active && v.available) {
          existing.hasActiveVariants = true;
        }
      }
    }
    const sizes = Array.from(sizeMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);

    // 3. Build combination dictionary and cross-reference maps
    const combinations: Record<string, VariantMatrixCell> = {};
    const colorToSizes: Record<string, string[]> = {};
    const sizeToColors: Record<string, string[]> = {};

    for (const c of colors) {
      colorToSizes[c.slug] = [];
    }
    for (const s of sizes) {
      sizeToColors[s.code] = [];
    }

    for (const v of variants) {
      if (!v.color || !v.size) continue;
      const cSlug = this.normalizeColorSlug(v.color.slug || v.color.name);
      const sCode = v.size.trim().toUpperCase();
      const key = `${cSlug}:${sCode}`;

      combinations[key] = {
        exists: true,
        available: v.active && v.available,
        variantId: v.id,
        sku: v.sku,
        sellingPrice: v.sellingPrice,
        mrp: v.mrp,
        sellingPriceMinor: v.sellingPriceMinor,
        mrpMinor: v.mrpMinor,
        discountPercent: v.discountPercent,
        images: v.variantImages || [],
      };

      if (v.active && v.available) {
        if (colorToSizes[cSlug] && !colorToSizes[cSlug].includes(sCode)) {
          colorToSizes[cSlug].push(sCode);
        }
        if (sizeToColors[sCode] && !sizeToColors[sCode].includes(cSlug)) {
          sizeToColors[sCode].push(cSlug);
        }
      }
    }

    // Sort valid sizes for each color deterministically
    for (const slug of Object.keys(colorToSizes)) {
      colorToSizes[slug] = this.sortSizes(colorToSizes[slug] || []);
    }

    // 4. Calculate deterministic default selection
    let defaultSelection: VariantMatrix["defaultSelection"] = null;
    const firstActiveVariant = activeVariants.find((v) => v.available) || activeVariants[0];

    if (firstActiveVariant && firstActiveVariant.color) {
      const cSlug = this.normalizeColorSlug(
        firstActiveVariant.color.slug || firstActiveVariant.color.name
      );
      defaultSelection = {
        colorSlug: cSlug,
        colorName: firstActiveVariant.color.name,
        size: firstActiveVariant.size.trim().toUpperCase(),
        variantId: firstActiveVariant.id,
        sku: firstActiveVariant.sku,
      };
    }

    return {
      colors,
      sizes,
      combinations,
      colorToSizes,
      sizeToColors,
      defaultSelection,
      totalActiveVariants: activeVariants.length,
    };
  }

  // -------------------------------------------------------------
  // CANONICAL VARIANT RESOLUTION
  // -------------------------------------------------------------

  /**
   * Canonical resolver: given a product's variants, a selected color and a selected size,
   * resolves to exactly one variant, or reports an invalid combination.
   *
   * Crucially: Never falls back to an arbitrary variant when a combination is missing!
   */
  public resolveVariant(params: {
    color: string;
    size: string;
    variants: ProductVariantDTO[];
  }): ResolvedVariantResult {
    const { color, size, variants } = params;

    if (!color && !size) {
      return {
        status: "NO_SELECTION",
        variant: null,
        media: [],
        isAvailable: false,
        message: "Please select a color and size",
      };
    }

    if (!color) {
      return {
        status: "NO_SELECTION",
        variant: null,
        media: [],
        isAvailable: false,
        message: "Please select a color",
      };
    }

    if (!size) {
      return {
        status: "NO_SELECTION",
        variant: null,
        media: [],
        isAvailable: false,
        message: "Please select a size",
      };
    }

    const targetColorSlug = this.normalizeColorSlug(color);
    const targetSize = size.trim().toUpperCase();

    // Find candidate matching color and size
    const matched = variants.find((v) => {
      const vColorSlug = this.normalizeColorSlug(v.color.slug || v.color.name);
      const vSize = v.size.trim().toUpperCase();
      return vColorSlug === targetColorSlug && vSize === targetSize;
    });

    if (!matched) {
      return {
        status: "INVALID_COMBINATION",
        variant: null,
        media: [],
        isAvailable: false,
        message: `Size '${targetSize}' is unavailable in '${this.normalizeColorName(color)}' for this silhouette.`,
      };
    }

    if (!matched.active || !matched.available) {
      return {
        status: "UNAVAILABLE",
        variant: matched,
        sku: matched.sku,
        price: {
          sellingPrice: matched.sellingPrice,
          mrp: matched.mrp,
          sellingPriceMinor: matched.sellingPriceMinor,
          mrpMinor: matched.mrpMinor,
          discountPercent: matched.discountPercent,
        },
        media: matched.variantImages || [],
        isAvailable: false,
        message: "This combination is currently out of stock.",
      };
    }

    return {
      status: "RESOLVED",
      variant: matched,
      sku: matched.sku,
      price: {
        sellingPrice: matched.sellingPrice,
        mrp: matched.mrp,
        sellingPriceMinor: matched.sellingPriceMinor,
        mrpMinor: matched.mrpMinor,
        discountPercent: matched.discountPercent,
      },
      media: matched.variantImages || [],
      isAvailable: true,
      message: "Variant resolved successfully",
    };
  }

  // -------------------------------------------------------------
  // PRODUCT ARCHETYPE & VARIANT DIMENSIONS
  // -------------------------------------------------------------

  /**
   * Determines the applicable variant dimension scheme for a product.
   * Adapts naturally for accessories (bags, scarves), single-variant silhouettes,
   * or standard garments without hardcoding fragile string checks.
   */
  public getProductVariantDimensions(
    productType: string,
    variants: ProductVariantDTO[] = []
  ): VariantDimensionsScheme {
    const typeUpper = (productType || "").trim().toUpperCase();

    // Check if all variants are One Size / Free Size
    const uniqueSizes = Array.from(new Set(variants.map((v) => v.size.trim().toUpperCase())));
    const uniqueColors = Array.from(
      new Set(variants.map((v) => this.normalizeColorSlug(v.color.slug || v.color.name)))
    );

    const isAllOneSize =
      uniqueSizes.length > 0 &&
      uniqueSizes.every((s) => /^(ONE[ _]?SIZE|FREE[ _]?SIZE|OS|FS)$/i.test(s));

    // Single variant product (e.g. 1 color, 1 size)
    if (variants.length === 1 || (uniqueColors.length <= 1 && isAllOneSize)) {
      return {
        dimensionType: VariantDimensionType.SINGLE_VARIANT,
        requiresColor: false,
        requiresSize: false,
        sizeScheme: SizeScheme.ONE_SIZE,
        isSingleVariant: true,
      };
    }

    // Color only (e.g. Handbags, Wallets, One-size jewelry or scarves)
    if (
      isAllOneSize ||
      ["BAG", "HANDBAG", "WALLET", "SCARF", "JEWELRY", "CLUTCH", "TOTE"].includes(typeUpper)
    ) {
      return {
        dimensionType: VariantDimensionType.COLOR_ONLY,
        requiresColor: true,
        requiresSize: false,
        sizeScheme: SizeScheme.ONE_SIZE,
        isSingleVariant: false,
      };
    }

    // Size only (e.g. dedicated footwear/shoes without distinct color variants)
    if (
      ["SHOES", "FOOTWEAR", "BOOTS", "SNEAKERS"].includes(typeUpper) &&
      uniqueColors.length <= 1 &&
      uniqueSizes.length > 1
    ) {
      return {
        dimensionType: VariantDimensionType.SIZE_ONLY,
        requiresColor: false,
        requiresSize: true,
        sizeScheme: this.detectSizeScheme(uniqueSizes[0] || "M"),
        isSingleVariant: false,
      };
    }


    // Standard Garment (Color and Size)
    return {
      dimensionType: VariantDimensionType.COLOR_AND_SIZE,
      requiresColor: true,
      requiresSize: true,
      sizeScheme: this.detectSizeScheme(uniqueSizes[0] || "M"),
      isSingleVariant: false,
    };
  }
}

export const variantService = new VariantService();
