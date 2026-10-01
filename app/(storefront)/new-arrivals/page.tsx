import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { productService } from "@/modules/catalog/product.service";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductPreview } from "@/types/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Season Arrivals | VÉRONA",
  description: "Explore the latest runway releases, limited seasonal capsules, and fresh atelier drops at VÉRONA.",
};

const DROPS = [
  {
    title: "Autumn/Winter Haute Capsule",
    tag: "Runway Release",
    description: "Architectural capes, Italian wool overcoats, and jewel-tone silk separates.",
    href: `${ROUTES.SHOP}?tag=aw-edit`,
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "Hand-Embroidered Festive Drop",
    tag: "Artisanal Limited Drop",
    description: "Intricate metallic marodi and zardozi needlework executed on pure organza.",
    href: `${ROUTES.SHOP}?tag=festive-drop`,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
  },
  {
    title: "Signature Linen Series 2026",
    tag: "Atelier Resort",
    description: "Breathable double-breasted blazers and unlined popover shirts for warmer climates.",
    href: `${ROUTES.SHOP}?tag=linen-2026`,
    image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=800",
  },
];

export default async function NewArrivalsPage() {
  let products: ProductPreview[] = [];
  try {
    const res = await productService.getNewArrivals({ limit: 8 });
    products = res.items;
  } catch {
    products = [];
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <Breadcrumbs items={[{ label: "New Arrivals" }]} />

      <div className="border-b border-border/80 pb-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Fresh From The Ateliers</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-foreground font-light tracking-tight">
          New Season Arrivals
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          The vanguard of modern Indian luxury. Fresh silhouettes released in strictly limited numbers, balancing bespoke tailoring discipline with poetic fluid draping.
        </p>
      </div>

      {/* Real Catalog New Arrivals */}
      {products.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
                Immediate Availability
              </span>
              <h2 className="font-serif text-2xl font-light text-foreground">
                Latest Atelier Garments
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">
              {products.length} New Silhouettes
            </span>
          </div>
          <ProductGrid products={products} />
        </div>
      )}

      {/* Seasonal Capsules & Editorial Drops */}
      <div className="space-y-6">
        <div className="border-b border-border/40 pb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
            Curated Editorials
          </span>
          <h2 className="font-serif text-2xl font-light text-foreground">
            Seasonal Runway Capsules
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {DROPS.map((drop, idx) => (
            <Link
              key={idx}
              href={drop.href}
              className="group block border border-border/80 rounded-sm overflow-hidden bg-background hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors shadow-subtle flex flex-col justify-between"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <Image
                  src={drop.image}
                  alt={drop.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md text-amber-300 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded">
                  {drop.tag}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <h2 className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                  {drop.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {drop.description}
                </p>
                <div className="pt-2 flex items-center text-xs font-medium text-foreground group-hover:translate-x-1 transition-transform">
                  Explore Release <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-neutral-100 dark:bg-neutral-900 border border-border p-8 rounded-sm text-center space-y-4">
        <h3 className="font-serif text-2xl font-light text-foreground">
          Seeking Complete Seasonal Catalogues?
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Explore all our luxury garments across Men&apos;s and Women&apos;s departments with custom fabric and size filtering.
        </p>
        <Link href={ROUTES.SHOP}>
          <Button size="sm" className="text-xs uppercase tracking-wider font-medium">
            Browse All Garments
          </Button>
        </Link>
      </div>
    </div>
  );
}
