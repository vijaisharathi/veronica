/**
 * VÉRONA — Fashion Collection Repository
 *
 * Data access layer for curated fashion collections.
 * Handles all database queries for collection browsing, filtering, and retrieval.
 */

import { FashionCollectionModel } from "@/db/models";
import { IFashionCollection } from "@/types/database";

export class CollectionRepository {
  /**
   * Find collection by unique slug
   */
  async findBySlug(slug: string): Promise<IFashionCollection | null> {
    return FashionCollectionModel.findOne({
      slug: slug.toLowerCase(),
      isDeleted: false,
    }).lean<IFashionCollection>();
  }

  /**
   * Find collection by ID
   */
  async findById(id: string): Promise<IFashionCollection | null> {
    return FashionCollectionModel.findOne({
      _id: id,
      isDeleted: false,
    }).lean<IFashionCollection>();
  }

  /**
   * Fetch all active collections, optionally filtered by currently active date range
   */
  async findActiveCollections(options?: {
    onlyCurrentlyActive?: boolean;
    limit?: number;
  }): Promise<IFashionCollection[]> {
    const query: Record<string, unknown> = {
      active: true,
      isDeleted: false,
    };

    if (options?.onlyCurrentlyActive) {
      const now = new Date();
      query.$or = [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
      ];
    }

    let cursor = FashionCollectionModel.find(query).sort({ sortOrder: 1 });

    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    return cursor.lean<IFashionCollection[]>();
  }

  /**
   * Find collections that include a specific category
   */
  async findByCategoryId(categoryId: string): Promise<IFashionCollection[]> {
    return FashionCollectionModel.find({
      categoryIds: categoryId,
      active: true,
      isDeleted: false,
    })
      .sort({ sortOrder: 1 })
      .lean<IFashionCollection[]>();
  }

  /**
   * Get featured collections for homepage/discovery (limited count)
   */
  async findFeaturedCollections(limit = 6): Promise<IFashionCollection[]> {
    return FashionCollectionModel.find({
      active: true,
      isDeleted: false,
    })
      .sort({ sortOrder: 1 })
      .limit(limit)
      .lean<IFashionCollection[]>();
  }

  /**
   * Soft delete collection
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await FashionCollectionModel.updateOne(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }
}

export const collectionRepository = new CollectionRepository();
