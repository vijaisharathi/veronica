import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { categoryService } from "@/modules/catalog/category.service";
import { collectionService } from "@/modules/catalog/collection.service";

export const metadata: Metadata = {
  title: "Women's Couture | VÉRONA",
  description: "Handcrafted sarees, sculptural evening dresses, and bespoke festive ensembles from VÉRONA.",
};

export const dynamic = "force-dynamic";

export default async function WomenPage() {
  let departmentData = null;
  let collections: Awaited<ReturnType<typeof collectionService.getActiveCollections>> = [];

  try {
    departmentData = await categoryService.getDepartmentCategories("women");
    collections = await collectionService.getActiveCollections({ limit: 2 });
  } catch {
    // Graceful fallback if database is not reachable at render time
  }

  const featuredCollection = collections[0] ?? null;
  const department = departmentData?.department;
  const subcategories = departmentData?.subcategories ?? [];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <Breadcrumbs items={[{ label: "Women's Collection" }]} />

      <div className="border-b border-border/80 pb-8 space-y-3">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Department • Haute Couture
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-foreground font-light tracking-tight">
          Women&apos;s Couture
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          {department?.description ??
            "Elegance defined by pure Mulberry silks, artisanal handloom weaves, and sculptural drapes. Designed for festive grandeur and refined everyday wear."}
        </p>
      </div>

      {/* Subcategory Grid — Database-Driven */}
      {subcategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {subcategories.map((cat) => (
            <Link
              key={cat.id}
              href={`${ROUTES.SHOP}?category=${cat.slug}&gender=women`}
              className="group block border border-border/80 rounded-sm overflow-hidden bg-background hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors shadow-subtle flex flex-col justify-between"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                {cat.image && (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="p-5 space-y-2">
                <h2 className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {cat.description ?? "Explore our curated selection."}
                </p>
                <div className="pt-2 flex items-center text-xs font-medium text-foreground group-hover:translate-x-1 transition-transform">
                  Explore Category <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-serif text-xl">Categories coming soon</p>
          <p className="text-xs mt-2">Our curated women&apos;s categories are being prepared.</p>
        </div>
      )}

      {/* Featured Collection Banner */}
      {featuredCollection && (
        <div className="bg-neutral-900 text-white p-8 sm:p-12 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              Featured Collection
            </span>
            <h3 className="font-serif text-2xl font-light">
              {featuredCollection.name}
            </h3>
            <p className="text-xs text-neutral-400 max-w-lg">
              {featuredCollection.description}
            </p>
          </div>
          <Link href={`${ROUTES.SHOP}?gender=women`}>
            <Button variant="secondary" size="sm" className="text-xs uppercase tracking-wider font-medium">
              View All Women&apos;s Couture
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
