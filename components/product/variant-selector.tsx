"use client";

import * as React from "react";
import { ProductVariantDTO } from "@/modules/catalog/product.dto";
import { variantService } from "@/modules/catalog/variant.service";
import { ColorSwatch, SizeMeasurement } from "@/types/storefront";
import { ColorSelector } from "./color-selector";
import { SizeSelector } from "./size-selector";
import { cn } from "@/lib/utils";

export interface VariantSelection {
  color: string;
  size: string;
  matchedVariant?: ProductVariantDTO | null;
  isAvailable: boolean;
}

export interface VariantSelectorProps {
  variants: ProductVariantDTO[];
  selectedColor: string;
  selectedSize: string;
  onSelectColor: (colorName: string) => void;
  onSelectSize: (sizeName: string) => void;
  productType?: string;
  measurements?: SizeMeasurement[];
  className?: string;
}

/**
 * VÉRONA — Variant Selector Foundation
 *
 * Consumes the canonical VariantMatrix from variantService.
 * Coordinates Color & Size selectors with dynamic cross-availability:
 * - Selecting a color dynamically filters valid sizes.
 * - Selecting a size dynamically marks unsupported colors.
 * - Enforces deterministic size ordering (XS -> S -> M -> L -> XL).
 * - Adapts to product archetype (garment vs. single-variant vs. accessory).
 */
export function VariantSelector({
  variants,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  productType = "Garment",
  measurements,
  className,
}: VariantSelectorProps) {
  // Pre-calculate canonical availability matrix
  const matrix = React.useMemo(() => {
    return variantService.buildVariantMatrix(variants);
  }, [variants]);

  // Product dimension rules (garment vs accessory vs single variant)
  const dimensions = React.useMemo(() => {
    return variantService.getProductVariantDimensions(productType, variants);
  }, [productType, variants]);

  // Map canonical colors to storefront swatches
  const colorSwatches: ColorSwatch[] = React.useMemo(() => {
    return matrix.colors.map((c) => ({
      name: c.name,
      slug: c.slug,
      hex: c.hexCode,
      secondaryHex: c.secondaryHexCode,
      image: c.swatchImage,
    }));
  }, [matrix.colors]);

  // Ordered list of unique sizes
  const sizes = React.useMemo(() => {
    return matrix.sizes.map((s) => s.code);
  }, [matrix.sizes]);

  // Determine sizes unavailable for the currently selected color
  const unavailableSizes = React.useMemo(() => {
    if (!selectedColor) return [];
    const colorSlug = variantService.normalizeColorSlug(selectedColor);
    const validSizes = matrix.colorToSizes[colorSlug] || [];
    return sizes.filter((s) => !validSizes.some((vs) => vs.toUpperCase() === s.toUpperCase()));
  }, [selectedColor, matrix.colorToSizes, sizes]);

  // Determine colors unavailable for the currently selected size
  const unavailableColors = React.useMemo(() => {
    if (!selectedSize) return [];
    const sizeNorm = selectedSize.trim().toUpperCase();
    const validColorSlugs = matrix.sizeToColors[sizeNorm] || [];
    return matrix.colors
      .filter((c) => !validColorSlugs.includes(c.slug))
      .map((c) => c.name);
  }, [selectedSize, matrix.sizeToColors, matrix.colors]);

  // If single-variant product and no interaction needed
  if (dimensions.isSingleVariant && variants.length === 1 && variants[0]) {
    const v = variants[0];
    return (
      <div className={cn("text-xs text-muted-foreground font-mono space-y-1", className)}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
            Edition:
          </span>
          <span>{v.color.name} — {variantService.getSizeDisplayLabel(v.size)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* 1. Color Swatch Selector (Shown if product requires color) */}
      {dimensions.requiresColor && colorSwatches.length > 0 && (
        <ColorSelector
          colors={colorSwatches}
          selectedColor={selectedColor}
          onSelectColor={onSelectColor}
          unavailableColors={unavailableColors}
        />
      )}

      {/* 2. Size Button Selector + Size Chart Dialog (Shown if product requires size) */}
      {dimensions.requiresSize && sizes.length > 0 && (
        <SizeSelector
          sizes={sizes}
          selectedSize={selectedSize}
          onSelectSize={onSelectSize}
          unavailableSizes={unavailableSizes}
          measurements={measurements}
        />
      )}
    </div>
  );
}
