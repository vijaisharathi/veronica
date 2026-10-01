

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchSort } from "@/modules/search/search.types";
import { ArrowUpDown } from "lucide-react";

export interface SearchSortProps {
  currentSort?: SearchSort;
}

const SORT_OPTIONS: Array<{ value: SearchSort; label: string }> = [
  { value: "relevance", label: "Best Match" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function SearchSortControl({ currentSort = "relevance" }: SearchSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SearchSort;
    const params = new URLSearchParams(searchParams.toString());

    if (newSort === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", newSort);
    }
    params.delete("page"); // Reset page

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="search-sort-select" className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
        <ArrowUpDown className="h-3 w-3" />
        <span>Sort:</span>
      </label>
      <div className="relative">
        <select
          id="search-sort-select"
          value={currentSort}
          onChange={handleSortChange}
          disabled={isPending}
          className="h-8 rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer disabled:opacity-50"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
