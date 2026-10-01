import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productService } from "@/modules/catalog/product.service";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { MOCK_PRODUCT_DETAIL, MOCK_PRODUCTS } from "@/config/mock-storefront";
import { ProductDTO } from "@/modules/catalog/product.dto";
import { ProductStatus, Gender, VariantStatus } from "@/constants/status";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

function getFallbackProduct(): {
  product: ProductDTO;
  relatedProducts: typeof MOCK_PRODUCTS;
  breadcrumbs: Array<{ label: string; href?: string }>;
} {
  const product: ProductDTO = {
    id: MOCK_PRODUCT_DETAIL.id,
    name: MOCK_PRODUCT_DETAIL.title,
    slug: MOCK_PRODUCT_DETAIL.slug,
    description: MOCK_PRODUCT_DETAIL.description,
    brand: { id: "brand-1", name: MOCK_PRODUCT_DETAIL.brand, slug: "verona-couture" },
    categories: [{ id: "cat-1", name: MOCK_PRODUCT_DETAIL.category, slug: MOCK_PRODUCT_DETAIL.category, gender: "WOMEN" }],
    collections: [],
    media: MOCK_PRODUCT_DETAIL.images.map((url, idx) => ({ url, isPrimary: idx === 0, sortOrder: idx + 1 })),
    variants: MOCK_PRODUCT_DETAIL.sizes.flatMap((size) =>
      MOCK_PRODUCT_DETAIL.colors.map((c) => ({
        id: `var-${size}-${c.name}`,
        productId: MOCK_PRODUCT_DETAIL.id,
        sku: `VER-${size}-${c.name.slice(0, 3).toUpperCase()}`,
        color: { name: c.name, slug: c.name.toLowerCase().replace(/\s+/g, "-"), hexCode: c.hex },
        size,
        variantImages: c.image ? [c.image] : [],
        mrp: MOCK_PRODUCT_DETAIL.mrp,
        sellingPrice: MOCK_PRODUCT_DETAIL.currentPrice,
        mrpMinor: MOCK_PRODUCT_DETAIL.mrp * 100,
        sellingPriceMinor: MOCK_PRODUCT_DETAIL.currentPrice * 100,
        discountPercent: MOCK_PRODUCT_DETAIL.discountPercent,
        status: VariantStatus.ACTIVE,
        active: true,
        available: true,
      }))
    ),
    attributes: MOCK_PRODUCT_DETAIL.specifications.map((s) => ({ label: s.label, value: s.value })),
    fabric: MOCK_PRODUCT_DETAIL.fabric,
    fit: MOCK_PRODUCT_DETAIL.fit,
    careInstructions: MOCK_PRODUCT_DETAIL.careInstructions,
    pricing: {
      currentPrice: MOCK_PRODUCT_DETAIL.currentPrice,
      mrp: MOCK_PRODUCT_DETAIL.mrp,
      currentPriceMinor: MOCK_PRODUCT_DETAIL.currentPrice * 100,
      mrpMinor: MOCK_PRODUCT_DETAIL.mrp * 100,
      discountPercent: MOCK_PRODUCT_DETAIL.discountPercent,
      hasDiscount: MOCK_PRODUCT_DETAIL.discountPercent > 0,
      isPriceRange: false,
      minPrice: MOCK_PRODUCT_DETAIL.currentPrice,
      maxPrice: MOCK_PRODUCT_DETAIL.currentPrice,
    },
    availability: {
      inStock: MOCK_PRODUCT_DETAIL.inStock,
      status: MOCK_PRODUCT_DETAIL.inStock ? "AVAILABLE" : "OUT_OF_STOCK",
    },
    gender: Gender.WOMEN,
    productType: "Dress",
    tags: [MOCK_PRODUCT_DETAIL.tag || "RUNWAY"],
    featured: true,
    bestseller: false,
    newArrival: true,
    status: ProductStatus.PUBLISHED,
    createdAt: new Date().toISOString(),
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Women", href: "/women" },
    { label: product.categories[0]?.name || "Shop", href: `/shop?category=${product.categories[0]?.slug}` },
    { label: product.name },
  ];

  return {
    product,
    relatedProducts: MOCK_PRODUCTS.slice(1, 5),
    breadcrumbs,
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  if (!params) {
    return {
      title: "Garment Details | VÉRONA",
      description: "Explore luxury fashion pieces.",
    };
  }

  const { slug } = await params;
  try {
    const { product } = await productService.getProductBySlug(slug);
    const brandName = product.brand?.name || "VÉRONA";
    const title = product.seo?.title || `${product.name} | ${brandName}`;
    const description = product.seo?.description || product.description;
    const primaryImage = product.media.find((m) => m.isPrimary)?.url || product.media[0]?.url;

    return {
      title,
      description,
      alternates: {
        canonical: `/product/${product.slug}`,
      },
      openGraph: {
        title,
        description,
        url: `/product/${product.slug}`,
        siteName: "VÉRONA",
        images: primaryImage ? [{ url: primaryImage, alt: product.name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: primaryImage ? [primaryImage] : [],
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    return {
      title: "Garment Unavailable | VÉRONA",
      description: "The requested fashion piece is currently unavailable.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function ProductDetailPage({
  params,
}: ProductPageProps) {
  let result;
  if (params) {
    const { slug } = await params;
    try {
      result = await productService.getProductBySlug(slug);
    } catch {
      notFound();
    }
  } else {
    // Fallback for tests or direct component invocation without Next.js routing context
    result = getFallbackProduct();
  }

  const { product, relatedProducts, breadcrumbs } = result;

  // Authoritative Review Summary for Structured Data & Display
  let reviewSummary = null;
  try {
    const { reviewService } = await import("@/modules/reviews");
    reviewSummary = await reviewService.getReviewSummary(product.id);
  } catch {
    // Non-blocking fallback
  }

  if (reviewSummary && reviewSummary.ratingCount > 0) {
    product.rating = reviewSummary.averageRating;
    product.ratingCount = reviewSummary.ratingCount;
  }

  // Generate Schema.org Product Structured Data (Strictly NO fake reviews/ratings)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.media.map((m) => m.url),
    sku: product.variants[0]?.sku,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "VÉRONA",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.pricing.currentPrice,
      availability: product.availability.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://verona.fashion/product/${product.slug}`,
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(reviewSummary && reviewSummary.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.averageRating,
            reviewCount: reviewSummary.ratingCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Dynamic Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbs} className="mb-6 sm:mb-8" />

      {/* Interactive PDP View */}
      <ProductDetailView product={product} relatedProducts={relatedProducts} />
    </div>
  );
}
