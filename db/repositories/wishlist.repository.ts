import { WishlistModel, WishlistItemModel } from "@/db/models";
import { IWishlist, IWishlistItem } from "@/types/database";

export class WishlistRepository {
  /**
   * Get or create customer default wishlist
   */
  async getOrCreateCustomerWishlist(customerId: string): Promise<IWishlist> {
    let wishlist = await WishlistModel.findOne({ customerId }).lean<IWishlist>();
    if (!wishlist) {
      const doc = await WishlistModel.create({ customerId, name: "Default" });
      wishlist = doc.toObject<IWishlist>();
    }
    return wishlist;
  }

  /**
   * Get all items in customer wishlist
   */
  async getWishlistItems(customerId: string): Promise<IWishlistItem[]> {
    return WishlistItemModel.find({ customerId })
      .sort({ addedAt: -1 })
      .lean<IWishlistItem[]>();
  }

  /**
   * Check if a product or variant is in customer wishlist
   */
  async isInWishlist(
    customerId: string,
    productId: string,
    variantId?: string | null
  ): Promise<boolean> {
    const query: Record<string, unknown> = { customerId, productId };
    if (variantId) {
      query.variantId = variantId;
    }
    const count = await WishlistItemModel.countDocuments(query);
    return count > 0;
  }

  /**
   * Add item to wishlist (idempotent, ignores duplicate key errors)
   */
  async addItem(
    customerId: string,
    productId: string,
    variantId?: string | null
  ): Promise<IWishlistItem | null> {
    const wishlist = await this.getOrCreateCustomerWishlist(customerId);
    try {
      const doc = await WishlistItemModel.create({
        wishlistId: wishlist._id,
        customerId,
        productId,
        variantId: variantId || null,
        addedAt: new Date(),
      });
      return doc.toObject<IWishlistItem>();
    } catch (err: unknown) {
      // If code is 11000 (duplicate key), item is already in wishlist
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        return WishlistItemModel.findOne({
          customerId,
          productId,
          variantId: variantId || null,
        }).lean<IWishlistItem>();
      }
      throw err;
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(
    customerId: string,
    productId: string,
    variantId?: string | null
  ): Promise<boolean> {
    const query: Record<string, unknown> = { customerId, productId };
    if (variantId) {
      query.variantId = variantId;
    }
    const res = await WishlistItemModel.deleteOne(query);
    return (res.deletedCount ?? 0) > 0;
  }

  /**
   * Get total count of items in customer wishlist
   */
  async getWishlistCount(customerId: string): Promise<number> {
    return WishlistItemModel.countDocuments({ customerId });
  }

  /**
   * Get list of all wishlisted product IDs for customer
   */
  async getWishlistProductIds(customerId: string): Promise<string[]> {
    const items = await WishlistItemModel.find({ customerId })
      .select({ productId: 1 })
      .sort({ addedAt: -1 })
      .lean<{ productId: { toString(): string } }[]>();
    return items.map((i) => i.productId.toString());
  }

  /**
   * Batch query wishlist status for an array of products (avoids N+1 queries)
   */
  async getWishlistStatusForProducts(
    customerId: string,
    productIds: string[]
  ): Promise<Record<string, boolean>> {
    const statusMap: Record<string, boolean> = {};
    if (!customerId || productIds.length === 0) {
      return statusMap;
    }

    for (const pid of productIds) {
      statusMap[pid] = false;
    }

    const items = await WishlistItemModel.find({
      customerId,
      productId: { $in: productIds },
    })
      .select({ productId: 1 })
      .lean<{ productId: { toString(): string } }[]>();

    for (const item of items) {
      statusMap[item.productId.toString()] = true;
    }

    return statusMap;
  }

  /**
   * Clear all items in customer wishlist
   */
  async clearWishlist(customerId: string): Promise<number> {
    const res = await WishlistItemModel.deleteMany({ customerId });
    return res.deletedCount ?? 0;
  }
}

export const wishlistRepository = new WishlistRepository();
