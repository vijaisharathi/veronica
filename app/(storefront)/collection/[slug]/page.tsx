import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { collectionService } from "@/modules/catalog/collection.service";
import { productService } from "@/modules/catalog/product.service";
import { ProductGrid } from "@/components/product/product-grid";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { collection } = await collectionService.getCollectionBySlug(slug);
    return {
      title: collection.seo?.title ?? `${collection.name} | VÉRONA`,
      description: collection.seo?.description ?? collection.description ?? "Explore this curated collection.",
    };
  } catch {
    return {
      title: "Collection | VÉRONA",
      description: "Explore curated fashion collections.",
    };
  }
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;

  let result;
  let collectionProductsResult;
  try {
    [result, collectionProductsResult] = await Promise.all([
      collectionService.getCollectionBySlug(slug),
      productService.getProductsByCollection(slug),
    ]);
  } catch {
    notFound();
  }

  const { collection, relatedCategories, breadcrumbs } = result;
  const collectionProducts = collectionProductsResult.products.items;

  return (
    <div className="flex flex-col w-full">
      {/* Hero Banner */}
      <div className="relative w-full h-[40vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden">
        <Image
          src={collection.banner ?? collection.heroImage}
          alt={collection.name}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
          <div className="container mx-auto">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400">
              Curated Collection
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white font-light tracking-tight mt-2">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-sm text-neutral-200 max-w-xl mt-3 leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={breadcrumbs.map((b) => ({
            label: b.label,
            href: b.href,
          }))}
        />

        {/* Related Categories */}
        {relatedCategories.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-border/80 pb-4">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
                Shop by Category
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground font-light mt-1">
                Categories in This Collection
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`${ROUTES.SHOP}?category=${cat.slug}`}
                  className="group block border border-border/80 rounded-sm overflow-hidden bg-background hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors shadow-subtle"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    {cat.image && (
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                    <div className="pt-1 flex items-center text-xs font-medium text-foreground group-hover:translate-x-1 transition-transform">
                      Browse <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Curated Collection Garments */}
        <div className="space-y-6">
          <div className="border-b border-border/80 pb-4 flex items-baseline justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
                Silhouettes In This Edit
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground font-light mt-1">
                Curated Garments
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {collectionProducts.length} styles
            </span>
          </div>

          {collectionProducts.length > 0 ? (
            <ProductGrid products={collectionProducts} />
          ) : (
            <div className="border border-dashed border-border/60 rounded-sm p-12 text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Coming Soon
              </span>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Silhouettes for this collection are being tailored at our atelier.
              </p>
              <Link href={ROUTES.SHOP}>
                <Button variant="outline" size="sm" className="text-xs uppercase tracking-wider font-medium mt-2">
                  Browse All Garments
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
