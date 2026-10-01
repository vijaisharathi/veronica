/**
 * VÉRONA — Garment Variant & Size Domain Type Definitions
 *
 * Establishes the canonical type contracts for Phase 12 (Garment Variant & Size System).
 * Enforces strict typing for colors, size schemes, availability matrices, SKU generation,
 * and variant resolution.
 */

import { VariantStatus } from "@/constants/status";
import { ProductVariantDTO } from "./product.dto";

/**
 * Supported sizing schemes across apparel, footwear, and accessories.
 */
export const SizeScheme = {
  LETTER: "LETTER",       // XXS, XS, S, M, L, XL, XXL, 3XL
  NUMERIC: "NUMERIC",     // 28, 30, 32, 34, 36, 38, 40, 42
  WAIST: "WAIST",         // 28W, 30W, 32W, 34W, 36W
  AGE: "AGE",             // 2-3Y, 4-5Y, 6-7Y, 8-9Y, 10-11Y
  ONE_SIZE: "ONE_SIZE",   // ONE SIZE, FREE SIZE
} as const;
export type SizeScheme = (typeof SizeScheme)[keyof typeof SizeScheme];

/**
 * Product-level variant dimension requirement based on product archetype.
 */
export const VariantDimensionType = {
  COLOR_AND_SIZE: "COLOR_AND_SIZE",
  COLOR_ONLY: "COLOR_ONLY",
  SIZE_ONLY: "SIZE_ONLY",
  SINGLE_VARIANT: "SINGLE_VARIANT",
} as const;
export type VariantDimensionType = (typeof VariantDimensionType)[keyof typeof VariantDimensionType];

export interface VariantDimensionsScheme {
  dimensionType: VariantDimensionType;
  requiresColor: boolean;
  requiresSize: boolean;
  sizeScheme: SizeScheme;
  isSingleVariant: boolean;
}

/**
 * Normalized color representation for swatches and accessible selectors.
 */
export interface CanonicalColor {
  name: string;
  slug: string;
  hexCode: string;
  secondaryHexCode?: string;
  swatchImage?: string;
  displayOrder: number;
  active: boolean;
  hasActiveVariants: boolean;
}

/**
 * Structured size representation separating internal identity from display label.
 */
export interface CanonicalSize {
  code: string;           // Internal identifier (e.g. "M", "32", "ONE_SIZE")
  label: string;          // Customer-facing label (e.g. "M", "32", "One Size")
  scheme: SizeScheme;
  sortOrder: number;
  hasActiveVariants: boolean;
}

/**
 * Individual combination cell status in the Color x Size matrix.
 */
export interface VariantMatrixCell {
  exists: boolean;
  available: boolean;
  variantId?: string;
  sku?: string;
  sellingPrice?: number;
  mrp?: number;
  sellingPriceMinor?: number;
  mrpMinor?: number;
  discountPercent?: number;
  images: string[];
}

/**
 * Availability matrix (Color x Size) providing instant O(1) combination lookups
 * without repeated database queries or frontend recalculations.
 */
export interface VariantMatrix {
  colors: CanonicalColor[];
  sizes: CanonicalSize[];
  // Key format: `${colorSlug}:${sizeCode.toUpperCase()}`
  combinations: Record<string, VariantMatrixCell>;
  // Map of colorSlug -> list of size codes valid for this color
  colorToSizes: Record<string, string[]>;
  // Map of sizeCode -> list of color slugs valid for this size
  sizeToColors: Record<string, string[]>;
  // Pre-calculated deterministic default selection
  defaultSelection: {
    colorSlug: string;
    colorName: string;
    size: string;
    variantId: string;
    sku: string;
  } | null;
  totalActiveVariants: number;
}

/**
 * Result of resolving a specific (color, size) combination.
 */
export interface ResolvedVariantResult {
  status: "RESOLVED" | "INVALID_COMBINATION" | "NO_SELECTION" | "UNAVAILABLE";
  variant: ProductVariantDTO | null;
  sku?: string;
  price?: {
    sellingPrice: number;
    mrp: number;
    sellingPriceMinor: number;
    mrpMinor: number;
    discountPercent: number;
  };
  media: string[];
  isAvailable: boolean;
  message?: string;
}

/**
 * Input for creating a variant with optional SKU (if omitted, server generates deterministically).
 */
export interface CreateVariantWithSkuPreviewInput {
  productId: string;
  sku?: string;
  color: {
    name: string;
    slug?: string;
    hexCode: string;
    secondaryHexCode?: string;
  };
  size: string;
  variantImages?: string[];
  mrp: number;
  sellingPrice: number;
  status?: VariantStatus;
  active?: boolean;
}
