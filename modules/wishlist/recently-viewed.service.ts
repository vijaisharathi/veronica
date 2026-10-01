/**
 * VÉRONA — Recently Viewed Domain Service
 *
 * Implements business logic for tracking customer and guest product interactions,
 * deterministic recent ordering, history bounding, and public catalog visibility filtering.
 */

import {
  recentlyViewedRepository,
  ViewerIdentity,
} from "@/db/repositories/recently-viewed.repository";
import { productService } from "@/modules/catalog/product.service";
import { ProductModel } from "@/db/models";
import { ProductStatus, ProductVisibility } from "@/constants/status";
import { ProductPreview } from "@/types/storefront";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/db/client";

export class RecentlyViewedService {
  /**
   * Record a genuine product view for a customer or guest session.
   * Silently ignores draft, archived, deleted, or nonexistent products.
   */
  async recordView(identity: ViewerIdentity, productId: string): Promise<boolean> {
    if (!productId || (!identity.customerId && !identity.sessionId)) {
      return false;
    }
    await connectToDatabase();

    // Verify product is currently public and active
    const product = await ProductModel.findOne({
      _id: productId,
      isDeleted: false,
      status: ProductStatus.PUBLISHED,
      visibility: ProductVisibility.PUBLIC,
    }).lean();

    if (!product) {
      return false;
    }

    const doc = await recentlyViewedRepository.recordView(identity, productId);
    if (doc) {
      logger.info("Recorded product view", {
        context: "RecentlyViewedService",
        metadata: {
          productId,
          hasCustomer: Boolean(identity.customerId),
          hasSession: Boolean(identity.sessionId),
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Retrieve recently viewed products for customer or guest session,
   * hydrated with current product details and sorted by viewedAt DESC.
   */
  async getRecentlyViewed(
    identity: ViewerIdentity,
    options: { limit?: number; excludeProductId?: string } = {}
  ): Promise<ProductPreview[]> {
    if (!identity.customerId && !identity.sessionId) {
      return [];
    }
    await connectToDatabase();

    const records = await recentlyViewedRepository.getRecentlyViewed(identity, options);
    if (records.length === 0) {
      return [];
    }

    const productIds = records.map((r) => r.productId.toString());
    // Hydrate via ProductService which guarantees batch loading and preserves ID ordering
    return productService.getProductPreviewsByIds(productIds);
  }

  /**
   * Clear all recently viewed products for the current customer or session
   */
  async clearRecentlyViewed(identity: ViewerIdentity): Promise<number> {
    if (!identity.customerId && !identity.sessionId) {
      return 0;
    }
    await connectToDatabase();
    const count = await recentlyViewedRepository.clearRecentlyViewed(identity);
    logger.info("Cleared recently viewed history", {
      context: "RecentlyViewedService",
      metadata: { count },
    });
    return count;
  }

  /**
   * Remove an individual product from history
   */
  async removeItem(identity: ViewerIdentity, productId: string): Promise<boolean> {
    if (!productId || (!identity.customerId && !identity.sessionId)) {
      return false;
    }
    await connectToDatabase();
    return recentlyViewedRepository.removeItem(identity, productId);
  }
}

export const recentlyViewedService = new RecentlyViewedService();
