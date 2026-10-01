"use client";

import * as React from "react";
import Link from "next/link";
import { ProductDTO } from "@/modules/catalog/product.dto";
import { Gender, ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { ProductPreview } from "@/types/storefront";
import { ProductGallery } from "./product-gallery";
import { VariantSelector } from "./variant-selector";
import { PincodeChecker } from "./pincode-checker";
import { ProductShareButton } from "./product-share-button";
import { ProductGrid } from "./product-grid";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Heart, AlertCircle, Info, Sparkles, ShieldCheck, Star } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { WishlistContext } from "@/context/wishlist-context";
import { CartContext } from "@/context/cart-context";
import { RecentlyViewed } from "./recently-viewed";
import { ProductReviewsSection } from "./product-reviews-section";

const DEFAULT_PRODUCT: ProductDTO = {
  id: "default-product-1",
  name: "Artisan Handwoven Cotton Shirt",
  slug: "artisan-handwoven-cotton-shirt",
  description: "An exquisite handwoven khadi cotton piece tailored for artisanal elegance.",
  shortDescription: "Handcrafted luxury khadi garment.",
  brand: { id: "b1", name: "VÉRONA ATELIER", slug: "verona-atelier" },
  categories: [{ id: "c1", name: "Men", slug: "men", gender: "MEN" }],
  collections: [],
  productType: "SHIRT",
  gender: Gender.MEN,
  status: ProductStatus.PUBLISHED,
  visibility: ProductVisibility.PUBLIC,
  tags: ["handwoven", "cotton"],
  media: [{ url: "/images/placeholder.svg", isPrimary: true, sortOrder: 0 }],
  variants: [
    {
      id: "v1",
      productId: "default-product-1",
      sku: "VER-MEN-SHT-WHT-S",
      size: "S",
      color: { name: "Pearl White", slug: "pearl-white", hexCode: "#F8F9FA" },
      variantImages: ["/images/placeholder.svg"],
      sellingPrice: 4999,
      mrp: 5999,
      sellingPriceMinor: 499900,
      mrpMinor: 599900,
      discountPercent: 17,
      status: VariantStatus.ACTIVE,
      active: true,
      available: true,
    },
    {
      id: "v2",
      productId: "default-product-1",
      sku: "VER-MEN-SHT-WHT-M",
      size: "M",
      color: { name: "Pearl White", slug: "pearl-white", hexCode: "#F8F9FA" },
      variantImages: ["/images/placeholder.svg"],
      sellingPrice: 4999,
      mrp: 5999,
      sellingPriceMinor: 499900,
      mrpMinor: 599900,
      discountPercent: 17,
      status: VariantStatus.ACTIVE,
      active: true,
      available: true,
    },
    {
      id: "v3",
      productId: "default-product-1",
      sku: "VER-MEN-SHT-WHT-L",
      size: "L",
      color: { name: "Pearl White", slug: "pearl-white", hexCode: "#F8F9FA" },
      variantImages: ["/images/placeholder.svg"],
      sellingPrice: 4999,
      mrp: 5999,
      sellingPriceMinor: 499900,
      mrpMinor: 599900,
      discountPercent: 17,
      status: VariantStatus.ACTIVE,
      active: true,
      available: true,
    },
  ],


  attributes: [{ label: "Origin", value: "Bengal Handloom" }],
  fabric: "100% Organic Handspun Khadi",
  fit: "Relaxed Artisanal",
  careInstructions: ["Professional dry clean recommended"],
  pricing: {
    currentPrice: 4999,
    mrp: 5999,
    currentPriceMinor: 499900,
    mrpMinor: 599900,
    discountPercent: 17,
    hasDiscount: true,
    isPriceRange: false,
    minPrice: 4999,
    maxPrice: 4999,
  },
  availability: {
    inStock: true,
    status: "AVAILABLE",
  },
  featured: false,
  newArrival: true,
  bestseller: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

import { variantService } from "@/modules/catalog/variant.service";

export interface ProductDetailViewProps {
  product?: ProductDTO;
  relatedProducts?: ProductPreview[];
}

/**
 * VÉRONA — Product Detail Experience View
 *
 * Core interactive storefront presentation for individual fashion silhouettes.
 * Transforms customer-safe ProductDTO into an accessible, responsive atelier experience.
 * Conforms strictly to Phase 12 (Garment Variant & Size System) boundaries.
 */
export function ProductDetailView({
  product = DEFAULT_PRODUCT,
  relatedProducts = [],
}: ProductDetailViewProps = {}) {
  // Wishlist integration
  const wishlistContext = React.useContext(WishlistContext);
  const [localWishlisted, setLocalWishlisted] = React.useState(false);
  const isWishlisted = wishlistContext ? wishlistContext.isWishlisted(product.id) : localWishlisted;
  const [isWishlistPending, setIsWishlistPending] = React.useState(false);

  // Cart integration
  const cartContext = React.useContext(CartContext);
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);
  const [justAddedToCart, setJustAddedToCart] = React.useState(false);
  const [cartError, setCartError] = React.useState<string | null>(null);

  // Record genuine product view once per product visit
  React.useEffect(() => {
    if (product?.id && product.id !== "default-product-1") {
      fetch("/api/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => {
        // Silently handle any recording glitch without impacting user experience
      });
    }
  }, [product?.id]);

  // Pre-calculate canonical availability matrix
  const matrix = React.useMemo(() => {
    return variantService.buildVariantMatrix(product.variants);
  }, [product.variants]);

  // Extract initial selections from matrix default selection
  const [selectedColor, setSelectedColor] = React.useState<string>(
    matrix.defaultSelection?.colorName || ""
  );
  const [selectedSize, setSelectedSize] = React.useState<string>(
    matrix.defaultSelection?.size || ""
  );

  // Canonical variant resolution
  const resolvedResult = React.useMemo(() => {
    return variantService.resolveVariant({
      color: selectedColor,
      size: selectedSize,
      variants: product.variants,
    });
  }, [selectedColor, selectedSize, product.variants]);

  const currentVariant = resolvedResult.variant;

  // Live Inventory Availability (Phase 20)
  const [liveInventoryMatrix, setLiveInventoryMatrix] = React.useState<Record<string, Record<string, { isAvailable: boolean; isLowStock: boolean; stockStatus: string }>> | null>(null);

  React.useEffect(() => {
    if (product?.slug && product.slug !== "default-product-1") {
      fetch(`/api/products/${product.slug}/inventory`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.matrix) {
            setLiveInventoryMatrix(json.data.matrix);
          }
        })
        .catch(() => {
          // Gracefully fallback to catalog variant availability
        });
    }
  }, [product?.slug]);

  const currentInvStock = liveInventoryMatrix?.[selectedColor]?.[selectedSize];
  const isOutOfStock = currentInvStock ? !currentInvStock.isAvailable : resolvedResult.status === "UNAVAILABLE";
  const isLowStock = currentInvStock ? currentInvStock.isLowStock : false;


  // Gallery media switching: prioritize variant-specific images when a color is selected
  const galleryImages = React.useMemo(() => {
    // Check if current variant has specific imagery
    const variantImages = currentVariant?.variantImages || [];
    if (variantImages.length > 0) {
      // Merge with non-duplicate product media
      const otherMedia = product.media
        .map((m) => m.url)
        .filter((url) => !variantImages.includes(url));
      return [...variantImages, ...otherMedia];
    }

    // Check if any variant matching the selected color has images
    const matchingColorVariants = product.variants.filter(
      (v) => v.color?.name?.toLowerCase() === selectedColor.toLowerCase()
    );
    const colorImages = matchingColorVariants.flatMap((v) => v.variantImages || []);
    if (colorImages.length > 0) {
      const uniqueColorImgs = Array.from(new Set(colorImages));
      const otherMedia = product.media
        .map((m) => m.url)
        .filter((url) => !uniqueColorImgs.includes(url));
      return [...uniqueColorImgs, ...otherMedia];
    }

    // Default: use catalog media or placeholder
    return product.media.length > 0
      ? product.media.map((m) => m.url)
      : ["/images/placeholder.svg"];
  }, [currentVariant, product.media, product.variants, selectedColor]);

  // Pricing calculations
  const displaySellingPrice = currentVariant
    ? currentVariant.sellingPriceMinor
    : product.pricing.currentPriceMinor;
  const displayMrp = currentVariant
    ? currentVariant.mrpMinor
    : product.pricing.mrpMinor;
  const displayDiscount = currentVariant
    ? currentVariant.discountPercent
    : product.pricing.discountPercent;
  const isAvailable = resolvedResult.status === "RESOLVED" && resolvedResult.isAvailable;

  // Information Accordion items
  const accordionItems = [
    {
      id: "description",
      title: "Garment Narrative & Design Notes",
      content: (
        <div className="space-y-3 leading-relaxed text-xs text-muted-foreground">
          <p className="text-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "specifications",
      title: "Artisanal Specifications & Attributes",
      content: (
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
          {product.fabric && (
            <div className="border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground block text-[10px] font-mono uppercase tracking-wider">
                Fabric
              </span>
              <span className="font-medium text-foreground">{product.fabric}</span>
            </div>
          )}
          {product.fit && (
            <div className="border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground block text-[10px] font-mono uppercase tracking-wider">
                Fit
              </span>
              <span className="font-medium text-foreground">{product.fit}</span>
            </div>
          )}
          {product.pattern && (
            <div className="border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground block text-[10px] font-mono uppercase tracking-wider">
                Pattern
              </span>
              <span className="font-medium text-foreground">{product.pattern}</span>
            </div>
          )}
          {product.occasion && (
            <div className="border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground block text-[10px] font-mono uppercase tracking-wider">
                Occasion
              </span>
              <span className="font-medium text-foreground">{product.occasion}</span>
            </div>
          )}
          {product.season && (
            <div className="border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground block text-[10px] font-mono uppercase tracking-wider">
                Season
              </span>
              <span className="font-medium text-foreground">{product.season}</span>
            </div>
          )}
          {product.attributes.map((spec, idx) => (
            <div key={idx} className="border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground block text-[10px] font-mono uppercase tracking-wider">
                {spec.label}
              </span>
              <span className="font-medium text-foreground">{spec.value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "care",
      title: "Care & Preservation",
      content: (
        <ul className="list-disc pl-4 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
          {product.careInstructions.length > 0 ? (
            product.careInstructions.map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))
          ) : (
            <li>Professional dry clean recommended for luxury garment longevity.</li>
          )}
        </ul>
      ),
    },
    {
      id: "shipping",
      title: "Atelier Dispatch & Services",
      content: (
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            Every VÉRONA piece is inspected by our quality atelier before packaging in bespoke protective garment covers.
          </p>
          <div className="flex items-center gap-2 pt-1 text-foreground text-[11px] font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
            <span>Guaranteed Authenticity &amp; Hand-Finished Detailing</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-16">
      {/* Main PDP Grid: Gallery (Left) + Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left: Product Media Gallery */}
        <div className="lg:col-span-7">
          <ProductGallery
            images={galleryImages}
            title={product.name}
          />
        </div>

        {/* Right: Product Details & Presentation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Brand, Badges, and Title */}
          <div className="space-y-2 border-b border-border/80 pb-5">
            <div className="flex items-center justify-between">
              {product.brand ? (
                <Link
                  href={`/search?brand=${encodeURIComponent(product.brand.slug)}`}
                  className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {product.brand.name}
                </Link>
              ) : (
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  VÉRONA
                </span>
              )}

              <div className="flex items-center gap-2">
                <ProductShareButton title={product.name} slug={product.slug} />
                {product.newArrival && (
                  <Badge variant="gold" className="text-[9px] font-mono tracking-wider">
                    NEW
                  </Badge>
                )}
                {product.bestseller && (
                  <Badge variant="default" className="text-[9px] font-mono tracking-wider">
                    BESTSELLER
                  </Badge>
                )}
                {product.pricing.hasDiscount && (
                  <Badge variant="outline" className="text-[9px] font-mono tracking-wider text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                    SALE
                  </Badge>
                )}
              </div>
            </div>

            {/* Exactly One Primary H1 per Page */}
            <h1 className="text-xl sm:text-2xl font-serif font-light text-foreground uppercase tracking-wide leading-snug">
              {product.name}
            </h1>

            {/* Rating Anchor Link (Scroll to Reviews) */}
            {typeof product.rating === "number" && product.rating > 0 && (
              <a
                href="#reviews-section"
                className="inline-flex items-center gap-1.5 pt-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${
                        s <= Math.round(product.rating || 0)
                          ? "fill-amber-400 stroke-amber-400"
                          : "stroke-neutral-300 dark:stroke-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono font-medium text-foreground">
                  {product.rating.toFixed(1)}
                </span>
                <span>•</span>
                <span className="underline underline-offset-4 group-hover:text-primary">
                  {product.ratingCount || 0} {product.ratingCount === 1 ? "review" : "reviews"}
                </span>
              </a>
            )}

            {/* Pricing Presentation */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-2xl font-semibold text-neutral-950 dark:text-white">
                {formatMoney(displaySellingPrice)}
              </span>
              {displayMrp > displaySellingPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  MRP {formatMoney(displayMrp)}
                </span>
              )}
              {displayDiscount > 0 && (
                <span className="text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400">
                  ({displayDiscount}% OFF)
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Inclusive of all taxes &amp; duties
            </p>
          </div>

          {/* Variant Selection Foundation (Color + Size) */}
          <VariantSelector
            variants={product.variants}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            onSelectColor={setSelectedColor}
            onSelectSize={setSelectedSize}
            productType={product.productType}
          />

          {/* Availability State Display */}
          {product.variants.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs text-neutral-600 dark:text-neutral-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>This silhouette currently has no active variants in catalog.</span>
            </div>
          ) : resolvedResult.status === "INVALID_COMBINATION" ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{resolvedResult.message || "Selected combination is unavailable."}</span>
            </div>
          ) : resolvedResult.status === "UNAVAILABLE" || isOutOfStock ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>This silhouette combination is currently out of stock.</span>
            </div>
          ) : resolvedResult.status === "NO_SELECTION" ? (
            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              <span>{resolvedResult.message || "Please select a color and size."}</span>
            </div>
          ) : isLowStock ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-medium">Only a few left — Low Stock in Atelier</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span className="font-medium">In Stock — Ready for Atelier Dispatch</span>
            </div>
          )}

          {/* Active SKU Identifier */}
          {(resolvedResult.sku || currentVariant?.sku) && (
            <div className="text-[10px] font-mono text-muted-foreground">
              SKU: {resolvedResult.sku || currentVariant?.sku}
            </div>
          )}


          {/* Product Action Area */}
          {(() => {
            const isVariantResolved = resolvedResult.status === "RESOLVED";
            const canAddToCart = isVariantResolved && isAvailable && !isOutOfStock && !isAddingToCart;

            let addToCartButtonText = "Add to Bag";
            if (isAddingToCart) {
              addToCartButtonText = "Adding to Bag...";
            } else if (justAddedToCart) {
              addToCartButtonText = "Added to Bag";
            } else if (isOutOfStock) {
              addToCartButtonText = "Out of Stock";
            } else if (!selectedColor && !selectedSize) {
              addToCartButtonText = "Select Color & Size";
            } else if (!selectedColor) {
              addToCartButtonText = "Select Color";
            } else if (!selectedSize) {
              addToCartButtonText = "Select Size";
            } else if (resolvedResult.status === "INVALID_COMBINATION") {
              addToCartButtonText = "Combination Unavailable";
            } else if (!isAvailable || resolvedResult.status === "UNAVAILABLE") {
              addToCartButtonText = "Out of Stock";
            }

            const handleAddToCart = async () => {
              if (!resolvedResult.variant || !resolvedResult.isAvailable) return;
              setCartError(null);
              setIsAddingToCart(true);

              try {
                if (cartContext) {
                  const success = await cartContext.addToCart(product.id, resolvedResult.variant.id, 1);
                  if (success) {
                    setJustAddedToCart(true);
                    setTimeout(() => setJustAddedToCart(false), 2000);
                  } else if (cartContext.error) {
                    setCartError(cartContext.error);
                  }
                } else {
                  setJustAddedToCart(true);
                  setTimeout(() => setJustAddedToCart(false), 2000);
                }
              } catch (err) {
                setCartError(err instanceof Error ? err.message : "Failed to add garment to bag");
              } finally {
                setIsAddingToCart(false);
              }
            };

            return (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3">
                  {/* Add to Bag Button */}
                  <Button
                    size="lg"
                    variant={canAddToCart ? "primary" : "secondary"}
                    disabled={!canAddToCart}
                    onClick={handleAddToCart}
                    className="flex-1 tracking-widest text-xs font-semibold py-4 uppercase transition-all duration-200"
                    leftIcon={<ShoppingBag className="h-4 w-4" />}
                    title={canAddToCart ? "Add garment to shopping bag" : addToCartButtonText}
                  >
                    {addToCartButtonText}
                  </Button>

                  {/* Wishlist Button */}
                  <Button
                    size="lg"
                    variant={isWishlisted ? "primary" : "secondary"}
                    onClick={async () => {
                      setIsWishlistPending(true);
                      try {
                        if (wishlistContext) {
                          await wishlistContext.toggleWishlist(product.id);
                        } else {
                          setLocalWishlisted((prev) => !prev);
                        }
                      } finally {
                        setIsWishlistPending(false);
                      }
                    }}
                    disabled={isWishlistPending}
                    aria-pressed={isWishlisted}
                    className={`px-6 py-4 transition-all duration-200 ${
                      isWishlisted
                        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60"
                        : ""
                    }`}
                    aria-label={
                      isWishlisted
                        ? `Remove from wishlist: ${product.name}`
                        : `Save to wishlist: ${product.name}`
                    }
                    title={isWishlisted ? "In Wishlist" : "Add to Wishlist"}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isWishlisted
                          ? "fill-red-600 stroke-red-600 dark:fill-red-400 dark:stroke-red-400"
                          : "stroke-current"
                      }`}
                    />
                  </Button>
                </div>

                {cartError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-mono text-[11px] pt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{cartError}</span>
                  </div>
                )}

                {/* Commerce Boundary Information Note */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-1">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>Bag & Wishlist persistence unlock in upcoming commerce phases. Secure checkout unlocks in Phase 17.</span>
                </div>
              </div>
            );
          })()}

          {/* Pincode delivery serviceability foundation */}
          <PincodeChecker />

          {/* Garment Details & Specifications Accordion */}
          <div className="pt-2">
            <Accordion
              items={accordionItems}
              allowMultiple={true}
              defaultExpanded={["description", "specifications"]}
            />
          </div>
        </div>
      </div>

      {/* Customer Impressions & Verified Reviews Section */}
      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        productImage={product.media[0]?.url}
      />

      {/* Related Products / Complete the Look */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-border/80">
          <div className="mb-8">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-1">
              <Sparkles className="h-3 w-3" />
              <span>Complete The Look</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-light uppercase tracking-wider text-foreground">
              Pair With These Silhouettes
            </h2>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      )}

      {/* Recently Viewed Atelier Journey (Excludes current product) */}
      <RecentlyViewed excludeProductId={product.id} />
    </div>
  );
}
