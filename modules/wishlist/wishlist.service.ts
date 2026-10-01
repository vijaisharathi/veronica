/**
 * VÉRONA — Wishlist Domain Service
 *
 * Implements business logic for customer wishlist management,
 * idempotency, customer ownership enforcement, and public catalog visibility validation.
 */

import { wishlistRepository } from "@/db/repositories/wishlist.repository";
import { productService } from "@/modules/catalog/product.service";
import { ProductModel } from "@/db/models";
import { ProductStatus, ProductVisibility } from "@/constants/status";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { WishlistItemDto, WishlistResponse } from "./wishlist.types";
import { connectToDatabase } from "@/db/client";

export class WishlistService {
  /**
   * Get all active wishlist items for an authenticated customer, hydrated with product details
   */
  async getWishlist(customerId: string): Promise<WishlistResponse> {
    if (!customerId) {
      return { items: [], count: 0 };
    }
    await connectToDatabase();

    const rawItems = await wishlistRepository.getWishlistItems(customerId);
    if (rawItems.length === 0) {
      return { items: [], count: 0 };
    }

    const productIds = rawItems.map((item) => item.productId.toString());
    const previews = await productService.getProductPreviewsByIds(productIds);

    const previewMap = new Map<string, typeof previews[0]>();
    for (const preview of previews) {
      previewMap.set(preview.id, preview);
    }

    // Pair raw wishlist items with hydrated products.
    // Inactive or deleted products are omitted from active customer display.
    const items: WishlistItemDto[] = [];
    for (const item of rawItems) {
      const pId = item.productId.toString();
      const product = previewMap.get(pId);
      if (product) {
        items.push({
          id: item._id.toString(),
          wishlistId: item.wishlistId.toString(),
          customerId: item.customerId.toString(),
          productId: pId,
          variantId: item.variantId ? item.variantId.toString() : null,
          addedAt: item.addedAt instanceof Date ? item.addedAt.toISOString() : new Date(item.addedAt).toISOString(),
          product,
        });
      }
    }

    return {
      items,
      count: items.length,
    };
  }

  /**
   * Add a product to customer wishlist (idempotent, visibility verified)
   */
  async addToWishlist(
    customerId: string,
    productId: string,
    variantId?: string | null
  ): Promise<WishlistItemDto> {
    if (!customerId) {
      throw new Error("Customer identity required for wishlist operation");
    }
    await connectToDatabase();

    // Validate that the target product exists and is publicly visible
    const product = await ProductModel.findOne({
      _id: productId,
      isDeleted: false,
      status: ProductStatus.PUBLISHED,
      visibility: ProductVisibility.PUBLIC,
    }).lean();

    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    // Persist or return existing (idempotent)
    const savedItem = await wishlistRepository.addItem(customerId, productId, variantId);
    if (!savedItem) {
      throw new Error("Failed to persist wishlist item");
    }

    // Hydrate product preview for immediate UI consumption
    const [preview] = await productService.getProductPreviewsByIds([productId]);
    if (!preview) {
      throw new NotFoundError("Product", productId);
    }

    logger.info("Product added to wishlist", {
      context: "WishlistService",
      metadata: { customerId, productId, variantId },
    });

    return {
      id: savedItem._id.toString(),
      wishlistId: savedItem.wishlistId.toString(),
      customerId: savedItem.customerId.toString(),
      productId,
      variantId: savedItem.variantId ? savedItem.variantId.toString() : null,
      addedAt: savedItem.addedAt instanceof Date ? savedItem.addedAt.toISOString() : new Date(savedItem.addedAt).toISOString(),
      product: preview,
    };
  }

  /**
   * Remove a product from customer wishlist (idempotent, ownership enforced)
   */
  async removeFromWishlist(
    customerId: string,
    productId: string,
    variantId?: string | null
  ): Promise<boolean> {
    if (!customerId || !productId) {
      return false;
    }
    await connectToDatabase();

    const removed = await wishlistRepository.removeItem(customerId, productId, variantId);

    logger.info("Product removed from wishlist", {
      context: "WishlistService",
      metadata: { customerId, productId, removed },
    });

    return removed;
  }

  /**
   * Check if a specific product is wishlisted by the customer
   */
  async isWishlisted(
    customerId: string,
    productId: string,
    variantId?: string | null
  ): Promise<boolean> {
    if (!customerId || !productId) {
      return false;
    }
    await connectToDatabase();
    return wishlistRepository.isInWishlist(customerId, productId, variantId);
  }

  /**
   * Batch query wishlist status for an array of products (avoids N+1 queries)
   */
  async getWishlistStatusForProducts(
    customerId: string | null | undefined,
    productIds: string[]
  ): Promise<Record<string, boolean>> {
    if (!customerId || !productIds || productIds.length === 0) {
      const statusMap: Record<string, boolean> = {};
      for (const id of productIds || []) {
        statusMap[id] = false;
      }
      return statusMap;
    }
    await connectToDatabase();
    return wishlistRepository.getWishlistStatusForProducts(customerId, productIds);
  }

  /**
   * Get total count of wishlisted items for a customer
   */
  async getWishlistCount(customerId: string | null | undefined): Promise<number> {
    if (!customerId) {
      return 0;
    }
    await connectToDatabase();
    return wishlistRepository.getWishlistCount(customerId);
  }

  /**
   * Clear all wishlist items for a customer
   */
  async clearWishlist(customerId: string): Promise<number> {
    if (!customerId) {
      return 0;
    }
    await connectToDatabase();
    const count = await wishlistRepository.clearWishlist(customerId);
    logger.info("Wishlist cleared", {
      context: "WishlistService",
      metadata: { customerId, clearedCount: count },
    });
    return count;
  }
}

export const wishlistService = new WishlistService();
