import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { productService } from "@/modules/catalog/product.service";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductPreview } from "@/types/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curated Reductions & Archive Sale | VÉRONA",
  description: "Exclusive archive reductions on handcrafted designer couture, tailored blazers, and luxury essentials at VÉRONA.",
};

const SALE_TIERS = [
  {
    title: "Men's Tailoring Reductions",
    discount: "Up to 40% Off",
    description: "Double-breasted jackets, linen trousers, and artisanal shirts from past atelier seasons.",
    href: `${ROUTES.SHOP}?sale=true&gender=men`,
  },
  {
    title: "Women's Couture Archive",
    discount: "Up to 50% Off",
    description: "Limited quantities of handcrafted sarees, evening dresses, and bespoke separates.",
    href: `${ROUTES.SHOP}?sale=true&gender=women`,
  },
  {
    title: "Private Archive Edits",
    discount: "Rare Pieces",
    description: "Final remaining inventory of archival fashion runway capsules.",
    href: `${ROUTES.SHOP}?sale=true&tag=archive`,
  },
];

export default async function SalePage() {
  let products: ProductPreview[] = [];
  try {
    const res = await productService.getSaleProducts({ limit: 8 });
    products = res.items;
  } catch {
    products = [];
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <Breadcrumbs items={[{ label: "Curated Reductions" }]} />

      <div className="border-b border-border/80 pb-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.25em] text-red-600 dark:text-red-400">
          <Tag className="h-3.5 w-3.5" />
          <span>Curated Reductions • Limited Quantities</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-foreground font-light tracking-tight">
          Private Archive Sale
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Rare acquisition opportunities. Archived runway creations and past-season masterworks made available at exclusive ceremonial prices with complimentary courier packaging.
        </p>
      </div>

      {/* Real Catalog Sale Products */}
      {products.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-600 dark:text-red-400 block mb-1">
                Atelier Archive Reductions
              </span>
              <h2 className="font-serif text-2xl font-light text-foreground">
                Current Sale Pieces
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">
              {products.length} Garments on Reduction
            </span>
          </div>
          <ProductGrid products={products} />
        </div>
      )}

      {/* Curated Archive Tiers */}
      <div className="space-y-6">
        <div className="border-b border-border/40 pb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
            Department Tiers
          </span>
          <h2 className="font-serif text-2xl font-light text-foreground">
            Curated Categories &amp; Archives
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SALE_TIERS.map((tier, idx) => (
            <div
              key={idx}
              className="border border-border p-6 rounded-sm bg-background shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <span className="inline-block bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300 text-xs font-mono uppercase font-semibold px-2.5 py-1 rounded">
                  {tier.discount}
                </span>
                <h2 className="font-serif text-xl font-medium text-foreground">
                  {tier.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <Link href={tier.href}>
                <Button variant="outline" size="sm" className="w-full text-xs uppercase tracking-wider font-medium justify-between">
                  Browse Archive
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 text-white p-8 sm:p-12 rounded-sm text-center space-y-4">
        <h3 className="font-serif text-2xl font-light">
          Final Quantities &amp; Bespoke Inquiries
        </h3>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Archive sale orders feature our standard 14-day doorstep return guarantee and insured transit.
        </p>
        <Link href={`${ROUTES.SHOP}?sale=true`}>
          <Button variant="secondary" size="sm" className="text-xs uppercase tracking-wider font-medium">
            Explore All Sale Pieces
          </Button>
        </Link>
      </div>
    </div>
  );
}
