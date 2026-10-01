"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { SearchFilterFacets, SearchActiveFilters } from "@/modules/search/search.types";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export interface SearchFiltersProps {
  facets: SearchFilterFacets;
  activeFilters: SearchActiveFilters;
  className?: string;
}

export function SearchFilters({ facets, activeFilters, className }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  // Price local state for range inputs
  const [priceMinInput, setPriceMinInput] = React.useState(
    activeFilters.minPrice !== undefined ? String(activeFilters.minPrice) : ""
  );
  const [priceMaxInput, setPriceMaxInput] = React.useState(
    activeFilters.maxPrice !== undefined ? String(activeFilters.maxPrice) : ""
  );

  React.useEffect(() => {
    setPriceMinInput(activeFilters.minPrice !== undefined ? String(activeFilters.minPrice) : "");
    setPriceMaxInput(activeFilters.maxPrice !== undefined ? String(activeFilters.maxPrice) : "");
  }, [activeFilters.minPrice, activeFilters.maxPrice]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // Reset page

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    const minNum = parseFloat(priceMinInput);
    const maxNum = parseFloat(priceMaxInput);

    if (!isNaN(minNum) && minNum >= 0) {
      params.set("minPrice", String(Math.floor(minNum)));
    } else {
      params.delete("minPrice");
    }

    if (!isNaN(maxNum) && maxNum >= 0) {
      params.set("maxPrice", String(Math.floor(maxNum)));
    } else {
      params.delete("maxPrice");
    }

    params.delete("page");
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  // Compute active filter entries for pills
  const activeChips: Array<{ key: string; label: string; value: string }> = [];
  if (activeFilters.category) {
    const matched = facets.categories.find((c) => c.slug === activeFilters.category || c.id === activeFilters.category);
    activeChips.push({ key: "category", label: `Category: ${matched?.name || activeFilters.category}`, value: activeFilters.category });
  }
  if (activeFilters.collection) {
    const matched = facets.collections.find((c) => c.slug === activeFilters.collection || c.id === activeFilters.collection);
    activeChips.push({ key: "collection", label: `Collection: ${matched?.name || activeFilters.collection}`, value: activeFilters.collection });
  }
  if (activeFilters.brand) {
    const matched = facets.brands.find((b) => b.slug === activeFilters.brand || b.id === activeFilters.brand);
    activeChips.push({ key: "brand", label: `Brand: ${matched?.name || activeFilters.brand}`, value: activeFilters.brand });
  }
  if (activeFilters.gender) {
    activeChips.push({ key: "gender", label: `Department: ${activeFilters.gender}`, value: activeFilters.gender });
  }
  if (activeFilters.color) {
    activeChips.push({ key: "color", label: `Color: ${activeFilters.color}`, value: activeFilters.color });
  }
  if (activeFilters.size) {
    activeChips.push({ key: "size", label: `Size: ${activeFilters.size}`, value: activeFilters.size });
  }
  if (activeFilters.fabric) {
    activeChips.push({ key: "fabric", label: `Fabric: ${activeFilters.fabric}`, value: activeFilters.fabric });
  }
  if (activeFilters.fit) {
    activeChips.push({ key: "fit", label: `Fit: ${activeFilters.fit}`, value: activeFilters.fit });
  }
  if (activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined) {
    const priceLabel = `Price: ₹${activeFilters.minPrice || 0} - ₹${activeFilters.maxPrice || "Any"}`;
    activeChips.push({ key: "price", label: priceLabel, value: "price" });
  }

  const renderFilterContent = () => (
    <div className="space-y-6 text-xs">
      {/* 1. Genders / Department */}
      {facets.genders.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Department
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {facets.genders.map((g) => {
              const isSelected = activeFilters.gender === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => updateParam("gender", isSelected ? null : g.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs transition-colors",
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                      : "border-border hover:border-neutral-900 text-foreground"
                  )}
                >
                  {g.label} ({g.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Categories */}
      {facets.categories.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Categories
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {facets.categories.map((c) => {
              const isSelected = activeFilters.category === c.slug;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateParam("category", isSelected ? null : c.slug)}
                  className={cn(
                    "flex items-center justify-between w-full py-1 text-left rounded hover:text-neutral-900 dark:hover:text-white transition-colors",
                    isSelected ? "font-bold text-neutral-900 dark:text-white" : "text-muted-foreground"
                  )}
                >
                  <span>{c.name}</span>
                  <span className="font-mono text-[10px]">({c.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Brands */}
      {facets.brands.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Brands
          </h4>
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            {facets.brands.map((b) => {
              const isSelected = activeFilters.brand === b.slug;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateParam("brand", isSelected ? null : b.slug)}
                  className={cn(
                    "flex items-center justify-between w-full py-1 text-left rounded hover:text-neutral-900 dark:hover:text-white transition-colors",
                    isSelected ? "font-bold text-neutral-900 dark:text-white" : "text-muted-foreground"
                  )}
                >
                  <span>{b.name}</span>
                  <span className="font-mono text-[10px]">({b.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Sizes */}
      {facets.sizes.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Size
          </h4>
          <div className="grid grid-cols-4 gap-1.5">
            {facets.sizes.map((s) => {
              const isSelected = activeFilters.size === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => updateParam("size", isSelected ? null : s.label)}
                  className={cn(
                    "h-8 rounded border text-xs font-mono transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-neutral-900 text-white font-bold dark:bg-white dark:text-neutral-900"
                      : "border-border hover:border-neutral-900 text-foreground"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Colors */}
      {facets.colors.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Color
          </h4>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const isSelected = activeFilters.color === c.slug || activeFilters.color === c.name;
              return (
                <button
                  key={c.slug}
                  type="button"
                  title={`${c.name} (${c.count})`}
                  onClick={() => updateParam("color", isSelected ? null : c.slug)}
                  className={cn(
                    "h-6 w-6 rounded-full border border-border shadow-xs transition-transform",
                    isSelected ? "ring-2 ring-neutral-900 scale-110 dark:ring-white" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c.hexCode || "#888" }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Price Range */}
      <div className="space-y-2.5">
        <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
          Price (₹)
        </h4>
        <form onSubmit={handleApplyPrice} className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder={`Min (${facets.priceRange.min})`}
              value={priceMinInput}
              onChange={(e) => setPriceMinInput(e.target.value)}
              className="w-full h-8 px-2 rounded border border-border bg-background text-xs"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              min="0"
              placeholder={`Max (${facets.priceRange.max})`}
              value={priceMaxInput}
              onChange={(e) => setPriceMaxInput(e.target.value)}
              className="w-full h-8 px-2 rounded border border-border bg-background text-xs"
            />
          </div>
          <button
            type="submit"
            className="w-full h-7 rounded border border-border bg-neutral-100 hover:bg-neutral-200 text-foreground text-[11px] font-medium uppercase tracking-wider transition-colors dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            Apply Price
          </button>
        </form>
      </div>

      {/* 7. Fabrics */}
      {facets.fabrics.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Fabric
          </h4>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {facets.fabrics.map((f) => {
              const isSelected = activeFilters.fabric === f.label;
              return (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => updateParam("fabric", isSelected ? null : f.label)}
                  className={cn(
                    "flex items-center justify-between w-full py-0.5 text-left rounded hover:text-neutral-900 dark:hover:text-white transition-colors",
                    isSelected ? "font-bold text-neutral-900 dark:text-white" : "text-muted-foreground"
                  )}
                >
                  <span>{f.label}</span>
                  <span className="font-mono text-[10px]">({f.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. Fits */}
      {facets.fits.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
            Fit
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {facets.fits.map((fit) => {
              const isSelected = activeFilters.fit === fit.label;
              return (
                <button
                  key={fit.label}
                  type="button"
                  onClick={() => updateParam("fit", isSelected ? null : fit.label)}
                  className={cn(
                    "px-2.5 py-1 rounded border text-[11px] transition-colors",
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                      : "border-border hover:border-neutral-900 text-foreground"
                  )}
                >
                  {fit.label} ({fit.count})
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={className}>
      {/* Mobile Drawer Trigger Button */}
      <div className="lg:hidden flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters {activeChips.length > 0 && `(${activeChips.length})`}</span>
        </button>

        {activeChips.length > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-red-600 transition-colors uppercase font-mono"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Active Filter Chips / Pills */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Active:
          </span>
          {activeChips.map((chip) => (
            <div
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-foreground border border-border"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => {
                  if (chip.key === "price") {
                    updateParam("minPrice", null);
                    updateParam("maxPrice", null);
                  } else {
                    updateParam(chip.key, null);
                  }
                }}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-600 transition-colors uppercase font-mono ml-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 space-y-6 shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Refine Catalog
          </h3>
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors uppercase font-mono"
            >
              Reset All
            </button>
          )}
        </div>
        {renderFilterContent()}
      </aside>

      {/* Mobile Drawer */}
      <Drawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title="Refine Silhouettes"
        side="left"
      >
        <div className="p-4 space-y-6 pb-20">
          {renderFilterContent()}
          <div className="pt-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="w-full h-10 rounded-full bg-neutral-900 text-white text-xs font-medium uppercase tracking-wider hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
            >
              Show Results
            </button>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearAllFilters();
                  setIsMobileOpen(false);
                }}
                className="h-10 px-4 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
