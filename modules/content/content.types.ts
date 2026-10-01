/**
 * VÉRONA — Content Management Types & DTOs (Phase 28)
 */

import { ISeoMetadata } from "@/types/database";

export interface AdminBannerDTO {
  id: string;
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage?: string;
  ctaText?: string;
  ctaUrl?: string;
  placement: string;
  startAt?: string | null;
  endAt?: string | null;
  active: boolean;
  sortOrder: number;
  isCurrentlyActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHomepageSectionDTO {
  id: string;
  sectionType: string;
  title: string;
  subtitle?: string;
  contentReferences?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEditorialStoryDTO {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  heroImage?: string;
  author?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readingTimeMinutes?: number;
  publishedAt?: string | null;
  sortOrder: number;
  active: boolean;
  seo?: ISeoMetadata;
  createdAt: string;
  updatedAt: string;
}
