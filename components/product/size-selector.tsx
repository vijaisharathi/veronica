"use client";

import * as React from "react";
import { Ruler } from "lucide-react";
import { SizeChartDialog } from "./size-chart-dialog";
import { SizeMeasurement } from "@/types/storefront";
import { cn } from "@/lib/utils";

export interface SizeSelectorProps {
  sizes: string[];
  selectedSize?: string;
  onSelectSize: (size: string) => void;
  unavailableSizes?: string[];
  measurements?: SizeMeasurement[];
  className?: string;
}

/**
 * VÉRONA — Atelier Size Option Selector
 *
 * Fully accessible button/radio-group size selector with clear availability states,
 * ergonomic 44px touch targets for mobile, keyboard navigation, and size chart dialog trigger.
 */
export function SizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  unavailableSizes = [],
  measurements,
  className,
}: SizeSelectorProps) {
  const [isChartOpen, setIsChartOpen] = React.useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header: Label & Size Chart Trigger */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Select Size
          </span>
          {selectedSize && (
            <span className="text-xs font-mono text-muted-foreground">
              ({selectedSize})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsChartOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 underline underline-offset-4 transition-colors dark:text-neutral-400 dark:hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950"
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Size Chart</span>
        </button>
      </div>

      {/* Size Buttons Grid */}
      <div
        role="radiogroup"
        aria-label="Available Sizes"
        className="flex flex-wrap gap-2.5"
      >
        {sizes.map((size) => {
          const isSelected = selectedSize?.toUpperCase() === size.toUpperCase();
          const isUnavailable = unavailableSizes.some(
            (s) => s.toUpperCase() === size.toUpperCase()
          );

          const accessibleLabel = `${size}${
            isUnavailable
              ? " (Unavailable for selected color)"
              : isSelected
              ? " (Selected)"
              : " (Available)"
          }`;

          return (
            <button
              key={size}
              type="button"
              aria-pressed={isSelected}
              aria-label={size}
              disabled={isUnavailable}
              onClick={() => onSelectSize(size)}
              className={cn(
                "relative flex h-11 min-w-[44px] px-3.5 items-center justify-center rounded border text-xs font-mono font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:focus-visible:ring-white",
                isSelected
                  ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950 font-bold shadow-sm"
                  : "border-border bg-surface text-foreground hover:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800",
                isUnavailable &&
                  "cursor-not-allowed opacity-40 bg-neutral-100 dark:bg-neutral-900 border-dashed text-neutral-400 overflow-hidden"
              )}
              title={accessibleLabel}
            >
              <span>{size}</span>
              {isUnavailable && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-full border-t border-neutral-400 -rotate-45" />
                </span>
              )}
            </button>
          );

        })}
      </div>

      {/* Sizing Dialog */}
      <SizeChartDialog
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        measurements={measurements}
      />
    </div>
  );
}
