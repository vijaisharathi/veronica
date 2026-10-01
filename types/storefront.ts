/**
 * VÉRONA — Storefront Presentation Type Definitions
 *
 * Strongly-typed domain models for UI presentation.
 * Designed to cleanly map to future Phase 03/04 database models and APIs.
 */

export type GenderCategory = "men" | "women" | "kids" | "unisex";

export interface ColorSwatch {
  name: string;
  hex: string;
  image?: string;
  secondaryHex?: string;
  slug?: string;
}


export interface SizeMeasurement {
  size: string;
  chest: string;
  waist: string;
  hip?: string;
  length: string;
}

export interface ProductPreview {
  id: string;
  slug: string;
  brand: string;
  title: string;
  currentPrice: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  ratingCount: number;
  primaryImage: string;
  hoverImage?: string;
  category: string;
  gender: GenderCategory;
  sizes: string[];
  colors: ColorSwatch[];
  isNew?: boolean;
  isSale?: boolean;
  inStock: boolean;
  tag?: string;
}

export interface ProductDetail extends ProductPreview {
  description: string;
  images: string[];
  highlights: string[];
  specifications: { label: string; value: string }[];
  fabric: string;
  fit: string;
  careInstructions: string[];
  sizeGuide: SizeMeasurement[];
  deliveryEstimateDays: number;
}

export interface CategoryPreview {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCount: number;
  tagline?: string;
}

export interface CollectionPreview {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

export interface MegaMenuItem {
  label: string;
  href: string;
  isNew?: boolean;
  isSale?: boolean;
}

export interface MegaMenuSection {
  title: string;
  items: MegaMenuItem[];
}

export interface NavigationCategory {
  id: string;
  name: string;
  slug: string;
  isHighlight?: boolean;
  sections: MegaMenuSection[];
  featuredImage?: {
    src: string;
    caption: string;
    href: string;
  };
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
  colorHex?: string;
}

export interface FilterGroup {
  id: string;
  name: string;
  type: "checkbox" | "radio" | "range" | "color" | "size";
  options: FilterOption[];
}

export interface ActiveFilter {
  groupId: string;
  groupName: string;
  value: string;
  label: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}
