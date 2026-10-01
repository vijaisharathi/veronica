import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ROUTES } from "@/config/routes";
import { collectionService } from "@/modules/catalog/collection.service";

export const metadata: Metadata = {
  title: "Collections | VÉRONA",
  description: "Explore curated fashion collections from VÉRONA — from monochromatic luxury to heritage festive edits.",
};

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  let collections: Awaited<ReturnType<typeof collectionService.getActiveCollections>> = [];

  try {
    collections = await collectionService.getActiveCollections();
  } catch {
    // Graceful fallback if database is not reachable at render time
  }

  const featured = collections[0] ?? null;
  const remaining = collections.slice(1);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <Breadcrumbs
        items={[
          { label: "Collections" },
        ]}
      />

      <div className="border-b border-border/80 pb-8 space-y-3">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Curated Edits • Seasonal Lookbooks
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-foreground font-light tracking-tight">
          Collections
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Hand-curated capsule collections, seasonal lookbooks, and thematic fashion edits. Each collection tells a story through fabric, form, and silhouette.
        </p>
      </div>

      {featured ? (
        <div className="space-y-8">
          {/* Featured First Collection — Large Banner */}
          <Link
            href={ROUTES.COLLECTION(featured.slug)}
            className="group block relative w-full h-[35vh] sm:h-[45vh] lg:h-[55vh] rounded-sm overflow-hidden"
          >
            <Image
              src={featured.heroImage}
              alt={featured.name}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400">
                Featured Collection
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl text-white font-light mt-2">
                {featured.name}
              </h2>
              <p className="text-xs text-neutral-200 max-w-lg mt-2 line-clamp-2">
                {featured.description}
              </p>
              <div className="mt-4 flex items-center text-xs font-medium text-white group-hover:translate-x-1 transition-transform uppercase tracking-wider">
                Explore Collection <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          {/* Remaining Collections Grid */}
          {remaining.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {remaining.map((collection) => (
                <Link
                  key={collection.id}
                  href={ROUTES.COLLECTION(collection.slug)}
                  className="group block border border-border/80 rounded-sm overflow-hidden bg-background hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors shadow-subtle"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <Image
                      src={collection.heroImage}
                      alt={collection.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                      {collection.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {collection.description}
                    </p>
                    <div className="pt-2 flex items-center text-xs font-medium text-foreground group-hover:translate-x-1 transition-transform">
                      Explore <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-serif text-xl">Collections coming soon</p>
          <p className="text-xs mt-2">Our curated collections are being assembled. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
