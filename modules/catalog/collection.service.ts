/**
 * VÉRONA — Fashion Collection Domain Service
 *
 * Business logic layer for curated fashion collection browsing.
 * Maps database documents to presentation-ready DTOs for the storefront.
 */

import { collectionRepository } from "@/db/repositories/collection.repository";
import { connectToDatabase } from "@/db/client";
import { IFashionCollection } from "@/types/database";
import { NotFoundError } from "@/lib/errors";
import { categoryService, CategoryDTO } from "./category.service";

// ---------- DTOs ----------

export interface CollectionDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  heroImage: string;
  banner?: string;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder: number;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  categoryIds: string[];
  productIds: string[];
}

export interface CollectionDetailResult {
  collection: CollectionDTO;
  relatedCategories: CategoryDTO[];
  breadcrumbs: Array<{ label: string; href?: string }>;
}

// ---------- Mappers ----------

function toCollectionDTO(doc: IFashionCollection): CollectionDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    heroImage: doc.heroImage,
    banner: doc.banner,
    active: doc.active,
    startDate: doc.startDate ? new Date(doc.startDate).toISOString() : null,
    endDate: doc.endDate ? new Date(doc.endDate).toISOString() : null,
    sortOrder: doc.sortOrder,
    seo: doc.seo,
    categoryIds: (doc.categoryIds ?? []).map((id) => id.toString()),
    productIds: (doc.productIds ?? []).map((id) => id.toString()),
  };
}

// ---------- Service ----------

export class CollectionService {
  /**
   * Get a single collection by slug with related categories and breadcrumbs.
   */
  async getCollectionBySlug(slug: string): Promise<CollectionDetailResult> {
    await connectToDatabase();
    const collection = await collectionRepository.findBySlug(slug);

    if (!collection || !collection.active) {
      throw new NotFoundError("Collection", slug);
    }

    const dto = toCollectionDTO(collection);

    // Resolve related categories
    const relatedCategories: CategoryDTO[] = [];
    for (const catId of dto.categoryIds) {
      const cat = await categoryService.getCategoryById(catId);
      if (cat) {
        relatedCategories.push(cat);
      }
    }

    const breadcrumbs = [
      { label: "Collections", href: "/shop" },
      { label: collection.name },
    ];

    return {
      collection: dto,
      relatedCategories,
      breadcrumbs,
    };
  }

  /**
   * Get all active collections for discovery pages.
   */
  async getActiveCollections(options?: {
    onlyCurrentlyActive?: boolean;
    limit?: number;
  }): Promise<CollectionDTO[]> {
    await connectToDatabase();
    const collections = await collectionRepository.findActiveCollections(options);
    return collections.map(toCollectionDTO);
  }

  /**
   * Get featured collections for homepage/discovery.
   */
  async getFeaturedCollections(limit = 6): Promise<CollectionDTO[]> {
    await connectToDatabase();
    const collections = await collectionRepository.findFeaturedCollections(limit);
    return collections.map(toCollectionDTO);
  }

  /**
   * Get collections associated with a specific category.
   */
  async getCollectionsForCategory(categoryId: string): Promise<CollectionDTO[]> {
    await connectToDatabase();
    const collections = await collectionRepository.findByCategoryId(categoryId);
    return collections.map(toCollectionDTO);
  }
}

export const collectionService = new CollectionService();
