"use client";

import * as React from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { ColorSwatch } from "@/types/storefront";
import { cn } from "@/lib/utils";

export interface ColorSelectorProps {
  colors: ColorSwatch[];
  selectedColor?: string;
  onSelectColor: (colorName: string) => void;
  unavailableColors?: string[];
  className?: string;
}

/**
 * VÉRONA — Atelier Color Swatch Selector
 *
 * Fully accessible radio-group color selector supporting solid colors,
 * dual-tone gradients, and tactile fabric/pattern images.
 * Conforms to WCAG 2.1 AA with textual screen-reader announcements
 * and keyboard navigation.
 */
export function ColorSelector({
  colors,
  selectedColor,
  onSelectColor,
  unavailableColors = [],
  className,
}: ColorSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Color
        </span>
        {selectedColor && (
          <span className="text-xs font-mono text-muted-foreground">
            ({selectedColor})
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Available Colors"
        className="flex items-center gap-3 flex-wrap"
      >
        {colors.map((color) => {
          const isSelected = selectedColor?.toLowerCase() === color.name.toLowerCase();
          const isUnavailable = unavailableColors.some(
            (c) => c.toLowerCase() === color.name.toLowerCase()
          );

          // Compute swatch background: pattern image, dual-tone gradient, or solid hex
          let swatchStyle: React.CSSProperties = { backgroundColor: color.hex };
          if (color.secondaryHex) {
            swatchStyle = {
              background: `linear-gradient(135deg, ${color.hex} 50%, ${color.secondaryHex} 50%)`,
            };
          }

          const accessibleLabel = `Select color ${color.name}${
            isUnavailable ? " (Unavailable)" : isSelected ? " (Selected)" : ""
          }`;

          return (
            <button
              key={color.name}
              type="button"
              aria-pressed={isSelected}
              aria-disabled={isUnavailable}
              aria-label={accessibleLabel}
              onClick={() => onSelectColor(color.name)}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:focus-visible:ring-white",
                isSelected
                  ? "ring-2 ring-neutral-900 ring-offset-2 border-neutral-400 scale-105 dark:ring-white dark:ring-offset-neutral-950"
                  : "border-border hover:scale-105",
                isUnavailable && "opacity-40 border-dashed cursor-pointer"
              )}
              style={color.image ? undefined : swatchStyle}
              title={accessibleLabel}
            >

              {color.image && (
                <Image
                  src={color.image}
                  alt={color.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              )}

              {/* Selected indicator checkmark */}
              {isSelected && (
                <Check
                  className={cn(
                    "relative z-10 h-4 w-4 drop-shadow",
                    ["#F8F8F6", "#FFFFFF", "#FBFBFA", "#D8C7B5", "#D4AF37", "#F9F6F0"].includes(
                      color.hex.toUpperCase()
                    )
                      ? "text-neutral-900"
                      : "text-white"
                  )}
                />
              )}

              {/* Diagonal strike-through line for unavailable color */}
              {isUnavailable && !isSelected && (
                <span className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <span className="w-full border-t border-neutral-500 -rotate-45" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
