"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { ProductPreview } from "@/types/storefront";
import { Badge } from "@/components/ui/badge";
import { WishlistContext } from "@/context/wishlist-context";

export interface ProductCardProps {
  product: ProductPreview;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const wishlistContext = React.useContext(WishlistContext);
  const [localWishlisted, setLocalWishlisted] = React.useState(false);

  const isWishlisted = wishlistContext ? wishlistContext.isWishlisted(product.id) : localWishlisted;
  const [isHovered, setIsHovered] = React.useState(false);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistContext) {
      wishlistContext.toggleWishlist(product.id);
    } else {
      setLocalWishlisted((prev) => !prev);
    }
  };

  const imageSrc = isHovered && product.hoverImage ? product.hoverImage : product.primaryImage;

  return (
    <article className="group relative flex flex-col rounded overflow-hidden bg-surface transition-all duration-300 hover:shadow-subtle border border-transparent hover:border-border/60">
      {/* Product Image Frame (3:4 Fashion Aspect Ratio) */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-portrait-fashion w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={imageSrc}
          alt={product.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Wishlist Floating Button */}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-pressed={isWishlisted}
          aria-label={
            isWishlisted
              ? `Remove from wishlist: ${product.title}`
              : `Add to wishlist: ${product.title}`
          }
          className={`absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:bg-white hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary ${
            isWishlisted ? "text-red-600" : "text-neutral-700 dark:text-neutral-300"
          }`}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isWishlisted ? "fill-red-600 stroke-red-600" : "stroke-current"
            }`}
          />
        </button>

        {/* Top-Left Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 pointer-events-none">
          {product.tag && (
            <Badge
              variant={product.tag === "SOLD OUT" ? "destructive" : "default"}
              className="text-[9px] font-mono tracking-wider shadow-sm"
            >
              {product.tag}
            </Badge>
          )}
          {product.isSale && (
            <Badge variant="sale" className="text-[9px] font-mono tracking-wider shadow-sm">
              SALE
            </Badge>
          )}
        </div>

        {/* Rating Star Badge (Floating at bottom-left of image) */}
        {product.rating > 0 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-neutral-900 dark:text-neutral-100 shadow-sm">
            <span>{product.rating.toFixed(1)}</span>
            <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-500 font-normal">{product.ratingCount}</span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1 rounded text-xs font-mono uppercase tracking-widest font-semibold shadow-md">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Product Information Panel */}
      <div className="flex flex-col p-3 text-left">
        {/* Brand */}
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">
          {product.brand}
        </span>

        {/* Product Title */}
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 text-xs font-medium text-foreground hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors line-clamp-1"
          title={product.title}
        >
          {product.title}
        </Link>

        {/* Pricing & Discount */}
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-neutral-950 dark:text-white">
            ₹{product.currentPrice.toLocaleString("en-IN")}
          </span>
          {product.mrp > product.currentPrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              ₹{product.mrp.toLocaleString("en-IN")}
            </span>
          )}
          {product.discountPercent > 0 && (
            <span className="text-[10px] font-semibold font-mono text-emerald-700 dark:text-emerald-400">
              ({product.discountPercent}% OFF)
            </span>
          )}
        </div>

        {/* Available Sizes Hint */}
        <div className="mt-2 text-[10px] font-mono text-muted-foreground truncate">
          Sizes: {product.sizes.join(", ")}
        </div>
      </div>
    </article>
  );
}
