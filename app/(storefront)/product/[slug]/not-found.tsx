import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export default function ProductNotFound() {
  return (
    <div className="container mx-auto px-4 py-20 text-center max-w-lg space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          404 — Atelier Catalog
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-light text-foreground tracking-tight">
          Silhouette Not Found
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2">
          The garment you are looking for has either concluded its seasonal run, been archived from our ateliers, or does not exist.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Link href={ROUTES.SHOP}>
          <Button variant="primary" size="md" className="w-full sm:w-auto text-xs uppercase tracking-wider">
            <Compass className="h-3.5 w-3.5 mr-1.5" />
            Explore Catalog
          </Button>
        </Link>
        <Link href={ROUTES.SEARCH}>
          <Button variant="outline" size="md" className="w-full sm:w-auto text-xs uppercase tracking-wider">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Search Collections
          </Button>
        </Link>
      </div>

      <div className="pt-6 border-t border-border/80">
        <Link
          href={ROUTES.HOME}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Return to VÉRONA Storefront</span>
        </Link>
      </div>
    </div>
  );
}
