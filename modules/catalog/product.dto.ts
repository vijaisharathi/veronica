/**
 * VÉRONA — Customer-Safe Product Catalog DTOs
 *
 * Exposes strictly validated, sanitized, customer-safe domain objects.
 * Never leaks internal database identifiers, supplier costs, or staff metadata.
 */

import { Gender, ProductStatus, VariantStatus, ProductVisibility } from "@/constants/status";
import { ProductPreview, ColorSwatch } from "@/types/storefront";

export interface ProductMediaDTO {
  url: string;
  alt?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductBrandDTO {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

export interface ProductCategoryDTO {
  id: string;
  name: string;
  slug: string;
  gender: string;
}

export interface ProductCollectionDTO {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  color: {
    name: string;
    slug: string;
    hexCode: string;
    secondaryHexCode?: string;
  };
  size: string;
  variantImages: string[];
  mrp: number; // in Rupees
  sellingPrice: number; // in Rupees
  mrpMinor: number; // in paise
  sellingPriceMinor: number; // in paise
  discountPercent: number;
  status: VariantStatus;
  active: boolean;
  available: boolean;
}

export interface ProductAttributeDTO {
  label: string;
  value: string;
}

export interface ProductPricingDTO {
  currentPrice: number; // in Rupees
  mrp: number; // in Rupees
  currentPriceMinor: number; // in paise
  mrpMinor: number; // in paise
  discountPercent: number;
  hasDiscount: boolean;
  isPriceRange: boolean;
  minPrice: number;
  maxPrice: number;
}

export interface ProductAvailabilityDTO {
  inStock: boolean;
  status: "AVAILABLE" | "OUT_OF_STOCK";
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  brand: ProductBrandDTO | null;
  categories: ProductCategoryDTO[];
  collections: ProductCollectionDTO[];
  media: ProductMediaDTO[];
  variants: ProductVariantDTO[];
  attributes: ProductAttributeDTO[];
  fabric?: string;
  fit?: string;
  pattern?: string;
  occasion?: string;
  season?: string;
  careInstructions: string[];
  pricing: ProductPricingDTO;
  availability: ProductAvailabilityDTO;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  gender: Gender;
  productType: string;
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  status: ProductStatus;
  visibility?: ProductVisibility;
  rating?: number;
  ratingCount?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Maps a customer-safe ProductDTO to a ProductPreview model
 * for seamless backward compatibility with ProductCard and ProductGrid.
 */
export function toProductPreview(dto: ProductDTO): ProductPreview {
  const primaryMedia =
    dto.media.find((m) => m.isPrimary)?.url || dto.media[0]?.url || "/images/placeholder.svg";
  const hoverMedia = dto.media.length > 1 ? dto.media[1]?.url : undefined;

  // Extract unique sizes
  const sizes = Array.from(new Set(dto.variants.map((v) => v.size)));

  // Extract unique colors
  const colorMap = new Map<string, ColorSwatch>();
  for (const v of dto.variants) {
    if (!colorMap.has(v.color.name)) {
      colorMap.set(v.color.name, {
        name: v.color.name,
        hex: v.color.hexCode,
        image: v.variantImages[0],
      });
    }
  }
  const colors = Array.from(colorMap.values());

  const isSale = dto.pricing.hasDiscount;
  let tag: string | undefined = undefined;
  if (!dto.availability.inStock) {
    tag = "SOLD OUT";
  } else if (dto.bestseller) {
    tag = "BESTSELLER";
  } else if (dto.newArrival) {
    tag = "NEW";
  } else if (isSale) {
    tag = "SALE";
  }

  return {
    id: dto.id,
    slug: dto.slug,
    brand: dto.brand?.name || "VÉRONA",
    title: dto.name,
    currentPrice: dto.pricing.currentPrice,
    mrp: dto.pricing.mrp,
    discountPercent: dto.pricing.discountPercent,
    rating: dto.rating ?? 0,
    ratingCount: dto.ratingCount ?? 0,
    primaryImage: primaryMedia,
    hoverImage: hoverMedia,
    category: dto.categories[0]?.name || dto.productType,
    gender: dto.gender.toLowerCase() as "men" | "women" | "kids" | "unisex",
    sizes,
    colors,
    isNew: dto.newArrival,
    isSale,
    inStock: dto.availability.inStock,
    tag,
  };
}
