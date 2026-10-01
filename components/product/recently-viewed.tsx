"use client";

import * as React from "react";
import { Eye, Trash2 } from "lucide-react";
import { ProductPreview } from "@/types/storefront";
import { ProductGrid } from "./product-grid";
import { Button } from "@/components/ui/button";

export interface RecentlyViewedProps {
  excludeProductId?: string;
  limit?: number;
  title?: string;
  subtitle?: string;
  showClearAction?: boolean;
  className?: string;
}

export function RecentlyViewed({
  excludeProductId,
  limit = 8,
  title = "Recently Viewed",
  subtitle = "Revisit silhouettes and artisanal garments from your recent exploration.",
  showClearAction = true,
  className = "",
}: RecentlyViewedProps) {
  const [items, setItems] = React.useState<ProductPreview[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isClearing, setIsClearing] = React.useState<boolean>(false);

  const fetchRecentlyViewed = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (excludeProductId) params.set("exclude", excludeProductId);
      if (limit) params.set("limit", limit.toString());

      const res = await fetch(`/api/recently-viewed?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setItems([]);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [excludeProductId, limit]);

  React.useEffect(() => {
    fetchRecentlyViewed();
  }, [fetchRecentlyViewed]);

  const handleClear = async () => {
    try {
      setIsClearing(true);
      const res = await fetch("/api/recently-viewed", { method: "DELETE" });
      if (res.ok) {
        setItems([]);
      }
    } catch {
      // safe fallback
    } finally {
      setIsClearing(false);
    }
  };

  // Do not render empty section if there are no recently viewed items
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recently Viewed Products"
      className={`py-12 border-t border-border/80 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
            <Eye className="h-3 w-3" />
            <span>Browsing Journey</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-light uppercase tracking-wider text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>

        {showClearAction && items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isClearing}
            className="text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
            aria-label="Clear recently viewed history"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {isClearing ? "Clearing..." : "Clear History"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-portrait-fashion rounded bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : (
        <ProductGrid products={items} />
      )}
    </section>
  );
}
