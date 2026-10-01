import { RecentlyViewedModel } from "@/db/models";
import { IRecentlyViewed } from "@/types/database";

export interface ViewerIdentity {
  customerId?: string | null;
  sessionId?: string | null;
}

export const MAX_RECENTLY_VIEWED_LIMIT = 30;

export class RecentlyViewedRepository {
  /**
   * Helper to build identity query filter (customerId takes precedence)
   */
  private buildIdentityFilter(identity: ViewerIdentity): Record<string, unknown> | null {
    if (identity.customerId) {
      return { customerId: identity.customerId };
    }
    if (identity.sessionId) {
      return { sessionId: identity.sessionId };
    }
    return null;
  }

  /**
   * Record a viewed product for customer or guest session (upsert + timestamp refresh)
   */
  async recordView(
    identity: ViewerIdentity,
    productId: string
  ): Promise<IRecentlyViewed | null> {
    const idFilter = this.buildIdentityFilter(identity);
    if (!idFilter || !productId) {
      return null;
    }

    const query = {
      ...idFilter,
      productId,
    };

    const doc = await RecentlyViewedModel.findOneAndUpdate(
      query,
      {
        $set: {
          ...idFilter,
          productId,
          viewedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean<IRecentlyViewed>();

    // Cap history to MAX_RECENTLY_VIEWED_LIMIT by pruning older records asynchronously
    this.pruneOldRecords(idFilter).catch(() => {
      // Background pruning should not fail the main recording flow
    });

    return doc;
  }

  /**
   * Prune records beyond the maximum allowed limit for an identity
   */
  private async pruneOldRecords(idFilter: Record<string, unknown>): Promise<void> {
    const totalCount = await RecentlyViewedModel.countDocuments(idFilter);
    if (totalCount > MAX_RECENTLY_VIEWED_LIMIT) {
      // Find the viewedAt timestamp of the MAX-th newest item
      const boundaryItems = await RecentlyViewedModel.find(idFilter)
        .sort({ viewedAt: -1 })
        .skip(MAX_RECENTLY_VIEWED_LIMIT - 1)
        .limit(1)
        .select({ viewedAt: 1 })
        .lean<IRecentlyViewed[]>();

      const oldestToKeep = boundaryItems[0];
      if (oldestToKeep && oldestToKeep.viewedAt) {
        await RecentlyViewedModel.deleteMany({
          ...idFilter,
          viewedAt: { $lt: oldestToKeep.viewedAt },
        });
      }
    }
  }

  /**
   * Retrieve recently viewed product entries for an identity, ordered by viewedAt DESC
   */
  async getRecentlyViewed(
    identity: ViewerIdentity,
    options: { limit?: number; excludeProductId?: string } = {}
  ): Promise<IRecentlyViewed[]> {
    const idFilter = this.buildIdentityFilter(identity);
    if (!idFilter) {
      return [];
    }

    const limit = Math.min(MAX_RECENTLY_VIEWED_LIMIT, Math.max(1, options.limit || 12));
    const query: Record<string, unknown> = { ...idFilter };

    if (options.excludeProductId) {
      query.productId = { $ne: options.excludeProductId };
    }

    return RecentlyViewedModel.find(query)
      .sort({ viewedAt: -1 })
      .limit(limit)
      .lean<IRecentlyViewed[]>();
  }

  /**
   * Clear all recently viewed items for an identity
   */
  async clearRecentlyViewed(identity: ViewerIdentity): Promise<number> {
    const idFilter = this.buildIdentityFilter(identity);
    if (!idFilter) {
      return 0;
    }
    const res = await RecentlyViewedModel.deleteMany(idFilter);
    return res.deletedCount ?? 0;
  }

  /**
   * Remove a single product from recently viewed history
   */
  async removeItem(identity: ViewerIdentity, productId: string): Promise<boolean> {
    const idFilter = this.buildIdentityFilter(identity);
    if (!idFilter || !productId) {
      return false;
    }
    const res = await RecentlyViewedModel.deleteOne({
      ...idFilter,
      productId,
    });
    return (res.deletedCount ?? 0) > 0;
  }
}

export const recentlyViewedRepository = new RecentlyViewedRepository();
