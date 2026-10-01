/**
 * VÉRONA — Homepage Presentation Type Definitions
 *
 * Strongly-typed domain models for Homepage & Fashion Discovery Experience.
 * Decoupled from MongoDB models and designed for future API service substitution.
 */

import { ProductPreview, CategoryPreview, CollectionPreview } from "./storefront";

export interface HeroCampaign {
  id: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  image: string;
  mobileImage?: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
}

export interface CollectionTile {
  id: string;
  title: string;
  tagline: string;
  image: string;
  href: string;
  itemCountLabel?: string;
}

export interface PromotionDeal {
  id: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  discountNote?: string;
}

export interface EditorialStory {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  readTime: string;
  href: string;
  author?: string;
}

export interface StyleCategory {
  id: string;
  name: string;
  descriptor: string;
  image: string;
  href: string;
  tag?: string;
}

export interface TrustBenefit {
  id: string;
  title: string;
  description: string;
  iconName: "returns" | "shield" | "truck" | "sparkles" | "headphones";
}

export interface HomepageData {
  hero: HeroCampaign;
  categories: CategoryPreview[];
  trendingProducts: ProductPreview[];
  newArrivals: ProductPreview[];
  featuredCollection: CollectionPreview;
  collectionGrid: CollectionTile[];
  popularPicks: ProductPreview[];
  promotion: PromotionDeal;
  editorialStories: EditorialStory[];
  styleCategories: StyleCategory[];
  trustBenefits: TrustBenefit[];
}
