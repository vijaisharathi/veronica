"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterSidebar } from "@/components/product/filter-sidebar";
import { MobileFilterDrawer } from "@/components/product/mobile-filter-drawer";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { MOCK_PRODUCTS, MOCK_FILTER_GROUPS } from "@/config/mock-storefront";
import { ActiveFilter, ProductPreview } from "@/types/storefront";

export default function ShopPage() {
  const [activeFilters, setActiveFilters] = React.useState<ActiveFilter[]>([]);
  const [sortOption, setSortOption] = React.useState("popularity");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);

  const toggleFilter = (
    groupId: string,
    groupName: string,
    value: string,
    label: string
  ) => {
    setActiveFilters((prev) => {
      const exists = prev.some((f) => f.groupId === groupId && f.value === value);
      if (exists) {
        return prev.filter((f) => !(f.groupId === groupId && f.value === value));
      } else {
        // If single select group (like radio price/discount), replace existing
        if (groupId === "price" || groupId === "discount") {
          const filtered = prev.filter((f) => f.groupId !== groupId);
          return [...filtered, { groupId, groupName, value, label }];
        }
        return [...prev, { groupId, groupName, value, label }];
      }
    });
    setCurrentPage(1);
  };

  const removeFilter = (groupId: string, value: string) => {
    setActiveFilters((prev) =>
      prev.filter((f) => !(f.groupId === groupId && f.value === value))
    );
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setCurrentPage(1);
  };

  // Filter & Sort evaluation for mock data
  const filteredProducts = React.useMemo(() => {
    let result: ProductPreview[] = [...MOCK_PRODUCTS];

    // Gender filter
    const genderFilters = activeFilters.filter((f) => f.groupId === "gender").map((f) => f.value);
    if (genderFilters.length > 0) {
      result = result.filter((p) => genderFilters.includes(p.gender));
    }

    // Category filter
    const categoryFilters = activeFilters.filter((f) => f.groupId === "category").map((f) => f.value);
    if (categoryFilters.length > 0) {
      result = result.filter((p) => categoryFilters.includes(p.category));
    }

    // Size filter
    const sizeFilters = activeFilters.filter((f) => f.groupId === "size").map((f) => f.value);
    if (sizeFilters.length > 0) {
      result = result.filter((p) => p.sizes.some((s) => sizeFilters.includes(s)));
    }

    // Sort evaluation
    if (sortOption === "price-low") {
      result.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (sortOption === "price-high") {
      result.sort((a, b) => b.currentPrice - a.currentPrice);
    } else if (sortOption === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === "newest") {
      result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }

    return result;
  }, [activeFilters, sortOption]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/shop" },
    { label: "All Garments", current: true },
  ];

  const sortOptions = [
    { label: "Recommended / Popularity", value: "popularity" },
    { label: "Newest Arrivals", value: "newest" },
    { label: "Price: Low to High", value: "price-low" },
    { label: "Price: High to Low", value: "price-high" },
    { label: "Customer Rating", value: "rating" },
  ];

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      {/* Top Breadcrumb */}
      <Breadcrumb items={breadcrumbs} className="mb-6" />

      {/* PLP Title & Count Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-light text-foreground uppercase tracking-wide">
            All Garments
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Displaying {filteredProducts.length} styles • Pure Natural Fibers
          </p>
        </div>

        {/* Filter Trigger (Mobile) & Sort Dropdown (Desktop/Mobile) */}
        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 rounded border border-border bg-surface px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters ({activeFilters.length})</span>
          </button>

          {/* Sort Dropdown */}
          <div className="w-52 sm:w-60">
            <Select
              options={sortOptions}
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-4 border-b border-border/60">
          <span className="text-[11px] font-mono text-muted-foreground uppercase mr-1">
            Active:
          </span>
          {activeFilters.map((filter) => (
            <Chip
              key={`${filter.groupId}-${filter.value}`}
              label={`${filter.groupName}: ${filter.label}`}
              onRemove={() => removeFilter(filter.groupId, filter.value)}
            />
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-red-600 hover:underline uppercase font-mono tracking-wider ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 items-start">
        {/* Persistent Desktop Sidebar */}
        <div className="hidden lg:block lg:col-span-3 sticky top-28">
          <FilterSidebar
            filterGroups={MOCK_FILTER_GROUPS}
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
            onClearAll={clearAllFilters}
          />
        </div>

        {/* Product Grid Area */}
        <div className="col-span-1 lg:col-span-9 space-y-12">
          <ProductGrid products={filteredProducts} />

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(filteredProducts.length / 8))}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filterGroups={MOCK_FILTER_GROUPS}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        onClearAll={clearAllFilters}
        resultCount={filteredProducts.length}
      />
    </div>
  );
}
