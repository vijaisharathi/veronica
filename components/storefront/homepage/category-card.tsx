import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { CategoryPreview } from "@/types/storefront";

export interface CategoryCardProps {
  category: CategoryPreview;
  priority?: boolean;
}

export function CategoryCard({ category, priority = false }: CategoryCardProps) {
  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className="group relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-border/60 transition-all duration-300 hover:shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Shop ${category.name}`}
    >
      <Image
        src={category.image}
        alt={category.name}
        fill
        priority={priority}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
        className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Atmospheric gradient overlay for typography readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent flex flex-col justify-end p-3.5 sm:p-4 text-white">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-medium tracking-wide leading-snug font-serif uppercase">
              {category.name}
            </h3>
            {category.itemCount > 0 && (
              <p className="text-[10px] font-mono text-neutral-300 mt-0.5 opacity-90">
                {category.itemCount}+ styles
              </p>
            )}
          </div>
          <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-white group-hover:text-neutral-950">
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
