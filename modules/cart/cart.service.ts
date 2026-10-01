/**
 * VÉRONA — Cart Domain Service
 *
 * Authoritative business service for Phase 14 (Cart System).
 * Enforces ownership, variant validity, non-negative integer quantities,
 * zero N+1 batch hydration, current catalog price resolution, and guest cart merging.
 */

import { cartRepository, CartWithItems } from "@/db/repositories/cart.repository";
import { productRepository } from "@/db/repositories/product.repository";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { ProductModel, ProductVariantModel, BrandModel } from "@/db/models";
import { connectToDatabase } from "@/db/client";
import { CartStatus, ProductStatus, ProductVisibility, VariantStatus } from "@/constants/status";
import { ICart, ICartItem, IProduct, IProductVariant, IBrand, MinorUnits } from "@/types/database";
import { ViewerIdentity } from "@/db/repositories/recently-viewed.repository";
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { minorToMajor } from "@/lib/money";
import { CART_CONFIG, MAX_CART_ITEM_QUANTITY, MIN_CART_ITEM_QUANTITY } from "@/config/cart";
import {
  AddToCartInput,
  CartDTO,
  CartItemDTO,
  CartItemAvailability,
  CartTotalsDTO,
} from "./cart.types";
import { AddToCartInputSchema, UpdateQuantityInputSchema } from "./cart.validation";
import { validateData } from "@/lib/validation";
import { pricingService } from "@/modules/pricing/pricing.service";
import { couponService } from "@/modules/pricing/coupon.service";

export class CartService {
  /**
   * Find or initialize an active cart for the customer or guest session
   */
  async getOrCreateActiveCart(identity: ViewerIdentity): Promise<ICart> {
    await connectToDatabase();
    let cart = await cartRepository.findActiveCart(identity);

    if (!cart) {
      cart = await cartRepository.createActiveCart(identity);
    }

    return cart;
  }

  /**
   * Retrieve hydrated CartDTO for viewer with zero N+1 queries.
   * Handles price change detection, out of stock statuses, and calculates subtotal.
   */
  async getCart(identity: ViewerIdentity): Promise<CartDTO> {
    await connectToDatabase();
    const cart = await cartRepository.findActiveCart(identity);

    if (!cart) {
      return this.buildEmptyCartDTO(identity);
    }

    const cartData = await cartRepository.getCartWithItems(cart._id.toString());
    if (!cartData || !cartData.items.length) {
      return this.buildEmptyCartDTO(identity, cart._id.toString(), cart.createdAt, cart.updatedAt);
    }

    // Zero N+1: Batch fetch all referenced products, variants, and brands
    const productIds = Array.from(new Set(cartData.items.map((i) => i.productId.toString())));
    const variantIds = Array.from(new Set(cartData.items.map((i) => i.variantId.toString())));

    const [products, variants] = await Promise.all([
      ProductModel.find({ _id: { $in: productIds } }).lean<IProduct[]>(),
      ProductVariantModel.find({ _id: { $in: variantIds } }).lean<IProductVariant[]>(),
    ]);

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    // Batch fetch referenced brands
    const brandIds = Array.from(
      new Set(
        products
          .map((p) => p.brandId?.toString())
          .filter((bId): bId is string => Boolean(bId))
      )
    );
    const brands = brandIds.length
      ? await BrandModel.find({ _id: { $in: brandIds } }).lean<IBrand[]>()
      : [];
    const brandMap = new Map(brands.map((b) => [b._id.toString(), b.name]));

    let calculatedSubtotalMinor: MinorUnits = 0;
    let hasUnavailableItems = false;
    let hasPriceChanges = false;

    const itemDTOs: CartItemDTO[] = [];

    for (const item of cartData.items) {
      const prod = productMap.get(item.productId.toString());
      const variant = variantMap.get(item.variantId.toString());

      let availability: CartItemAvailability = "AVAILABLE";
      let liveUnitPriceMinor: MinorUnits = item.unitPriceSnapshot;
      let priceChanged = false;

      // 1. Validate Product Status
      if (!prod || prod.isDeleted || prod.status !== ProductStatus.PUBLISHED || prod.visibility !== ProductVisibility.PUBLIC) {
        availability = "PRODUCT_UNAVAILABLE";
        hasUnavailableItems = true;
      }
      // 2. Validate Variant Status
      else if (!variant || !variant.active || variant.status !== VariantStatus.ACTIVE) {
        availability = "VARIANT_UNAVAILABLE";
        hasUnavailableItems = true;
      }
      // 3. Validate Live Stock Availability (if marked unavailable)
      else if ((variant as any).available === false) {
        availability = "OUT_OF_STOCK";
        hasUnavailableItems = true;
      }

      // 4. Resolve Live Catalog Price & Detect Price Changes
      if (variant && variant.sellingPrice !== undefined) {
        liveUnitPriceMinor = variant.sellingPrice;
        if (liveUnitPriceMinor !== item.unitPriceSnapshot) {
          priceChanged = true;
          hasPriceChanges = true;
          if (availability === "AVAILABLE") {
            availability = "PRICE_CHANGED";
          }
        }
      }

      const lineTotalMinor = liveUnitPriceMinor * item.quantity;
      calculatedSubtotalMinor += lineTotalMinor;

      const brandName = prod?.brandId ? brandMap.get(prod.brandId.toString()) || "VÉRONA" : "VÉRONA";
      const primaryImage =
        prod?.images?.find((img) => img.isPrimary)?.url || prod?.images?.[0]?.url;

      itemDTOs.push({
        id: item._id.toString(),
        cartId: item.cartId.toString(),
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        productName: prod ? prod.name : item.productNameSnapshot,
        slug: prod ? prod.slug : "",
        image: variant?.variantImages?.[0] || primaryImage || item.imageSnapshot,
        brand: brandName,
        selectedColor: variant?.color?.name || item.variantSnapshot?.color || "Standard",
        selectedSize: variant?.size || item.variantSnapshot?.size || "Standard",
        sku: variant?.sku || item.variantSnapshot?.sku || "",
        quantity: item.quantity,
        unitPriceMinor: liveUnitPriceMinor,
        unitPriceMajor: minorToMajor(liveUnitPriceMinor),
        lineTotalMinor,
        lineTotalMajor: minorToMajor(lineTotalMinor),
        priceChanged,
        previousPriceMinor: priceChanged ? item.unitPriceSnapshot : undefined,
        previousPriceMajor: priceChanged ? minorToMajor(item.unitPriceSnapshot) : undefined,
        availability,
        createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
      });
    }

    // Evaluate authoritative pricing pipeline (Phase 15 Engine)
    const pricingContext = {
      customerId: cart.customerId?.toString(),
      cartId: cart._id.toString(),
      items: itemDTOs.map((item) => {
        const prod = productMap.get(item.productId);
        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          categoryIds: prod?.categoryIds?.map((c) => c.toString()) || [],
          collectionIds: prod?.collectionIds?.map((c) => c.toString()) || [],
          brandId: prod?.brandId?.toString(),
        };
      }),
      couponCode: cart.couponCode || null,
      timestamp: new Date(),
      currency: "INR" as const,
    };

    const pricingBreakdown = await pricingService.calculateCartPricing(pricingContext);

    // Persist refreshed totals asynchronously if changed
    if (cart.subtotal !== pricingBreakdown.subtotalMinor || cart.total !== pricingBreakdown.grandTotalMinor) {
      await cartRepository.updateCartTotals(cart._id.toString(), {
        subtotal: pricingBreakdown.subtotalMinor,
        total: pricingBreakdown.grandTotalMinor,
        couponId: pricingBreakdown.appliedCoupon?.couponId,
        couponCode: pricingBreakdown.appliedCoupon?.code || cart.couponCode,
      });
    }

    const totalQuantity = itemDTOs.reduce((sum, item) => sum + item.quantity, 0);

    const totals: CartTotalsDTO = {
      subtotalMinor: pricingBreakdown.subtotalMinor,
      subtotalMajor: pricingBreakdown.subtotalMajor,
      promotionDiscountMinor: pricingBreakdown.promotionDiscountMinor,
      promotionDiscountMajor: pricingBreakdown.promotionDiscountMajor,
      couponDiscountMinor: pricingBreakdown.couponDiscountMinor,
      couponDiscountMajor: pricingBreakdown.couponDiscountMajor,
      discountMinor: pricingBreakdown.totalDiscountMinor,
      discountMajor: pricingBreakdown.totalDiscountMajor,
      shippingMinor: 0,
      taxMinor: 0,
      grandTotalMinor: pricingBreakdown.grandTotalMinor,
      grandTotalMajor: pricingBreakdown.grandTotalMajor,
      currency: CART_CONFIG.CURRENCY,
    };

    return {
      id: cart._id.toString(),
      customerId: cart.customerId?.toString(),
      sessionId: cart.sessionId,
      status: cart.status,
      items: itemDTOs,
      itemCount: totalQuantity,
      distinctItemCount: itemDTOs.length,
      totals,
      couponCode: cart.couponCode || null,
      pricingBreakdown,
      couponValidationMessage: pricingBreakdown.couponValidationMessage,
      hasUnavailableItems,
      hasPriceChanges,
      createdAt: cart.createdAt ? cart.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: cart.updatedAt ? cart.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Add a product variant to the cart.
   * Performs server-authoritative variant resolution and enforces uniqueness per variant.
   */
  async addItem(identity: ViewerIdentity, input: AddToCartInput): Promise<CartDTO> {
    await connectToDatabase();
    const validated = validateData(AddToCartInputSchema, input);
    const quantity = validated.quantity;

    // 1. Verify product validity
    const product = await productRepository.findById(validated.productId);
    if (!product || product.isDeleted || product.status !== ProductStatus.PUBLISHED || product.visibility !== ProductVisibility.PUBLIC) {
      throw new NotFoundError("Product", validated.productId);
    }

    // 2. Verify variant validity
    const variant = await productRepository.findVariantById(validated.variantId);
    if (!variant || variant.productId.toString() !== product._id.toString() || !variant.active || variant.status !== VariantStatus.ACTIVE) {
      throw new NotFoundError("ProductVariant", validated.variantId);
    }

    if ((variant as any).available === false) {
      throw new ConflictError("The selected garment combination is currently out of stock");
    }

    // 3. Resolve active cart
    const cart = await this.getOrCreateActiveCart(identity);

    // 4. Check if variant already exists in cart
    const existingItem = await cartRepository.findCartItemByVariant(
      cart._id.toString(),
      variant._id.toString()
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > MAX_CART_ITEM_QUANTITY) {
        throw new ValidationError(
          `Cannot add ${quantity} more. Maximum cart limit of ${MAX_CART_ITEM_QUANTITY} reached for this garment.`
        );
      }

      await cartRepository.updateCartItem(existingItem._id.toString(), {
        quantity: newQuantity,
        unitPriceSnapshot: variant.sellingPrice,
      });

      logger.info("Updated existing cart item quantity", {
        context: "CartService",
        metadata: { cartId: cart._id.toString(), variantId: variant._id.toString(), newQuantity },
      });
    } else {
      const primaryImg =
        product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;

      await cartRepository.createCartItem({
        cartId: cart._id.toString(),
        productId: product._id.toString(),
        variantId: variant._id.toString(),
        quantity,
        unitPriceSnapshot: variant.sellingPrice,
        productNameSnapshot: product.name,
        variantSnapshot: {
          color: variant.color?.name || "Standard",
          size: variant.size || "Standard",
          sku: variant.sku,
        },
        imageSnapshot: variant.variantImages?.[0] || primaryImg,
      });

      logger.info("Added new item to cart", {
        context: "CartService",
        metadata: { cartId: cart._id.toString(), variantId: variant._id.toString(), quantity },
      });
    }

    return this.getCart(identity);
  }

  /**
   * Update item quantity.
   * Enforces item ownership and removes item if quantity is set to 0.
   */
  async updateItemQuantity(
    identity: ViewerIdentity,
    itemId: string,
    quantity: number
  ): Promise<CartDTO> {
    await connectToDatabase();
    const validated = validateData(UpdateQuantityInputSchema, { quantity });

    const cart = await cartRepository.findActiveCart(identity);
    if (!cart) {
      throw new NotFoundError("Cart", "active");
    }

    const item = await cartRepository.findCartItemById(itemId);
    if (!item || item.cartId.toString() !== cart._id.toString()) {
      throw new AuthorizationError("Item does not belong to your shopping bag");
    }

    if (validated.quantity === 0) {
      await cartRepository.deleteCartItem(itemId);
      logger.info("Removed cart item due to 0 quantity", {
        context: "CartService",
        metadata: { cartId: cart._id.toString(), itemId },
      });
    } else {
      await cartRepository.updateCartItem(itemId, { quantity: validated.quantity });
      logger.info("Updated cart item quantity", {
        context: "CartService",
        metadata: { cartId: cart._id.toString(), itemId, quantity: validated.quantity },
      });
    }

    return this.getCart(identity);
  }

  /**
   * Remove an item from the cart. Enforces ownership server-side.
   */
  async removeItem(identity: ViewerIdentity, itemId: string): Promise<CartDTO> {
    await connectToDatabase();
    const cart = await cartRepository.findActiveCart(identity);
    if (!cart) {
      return this.buildEmptyCartDTO(identity);
    }

    const item = await cartRepository.findCartItemById(itemId);
    if (!item || item.cartId.toString() !== cart._id.toString()) {
      throw new AuthorizationError("Item does not belong to your shopping bag");
    }

    await cartRepository.deleteCartItem(itemId);
    logger.info("Removed cart item", {
      context: "CartService",
      metadata: { cartId: cart._id.toString(), itemId },
    });

    return this.getCart(identity);
  }

  /**
   * Clear all items from current cart. Idempotent.
   */
  async clearCart(identity: ViewerIdentity): Promise<CartDTO> {
    await connectToDatabase();
    const cart = await cartRepository.findActiveCart(identity);
    if (!cart) {
      return this.buildEmptyCartDTO(identity);
    }

    await cartRepository.clearCartItems(cart._id.toString());
    logger.info("Cleared shopping bag", {
      context: "CartService",
      metadata: { cartId: cart._id.toString() },
    });

    return this.getCart(identity);
  }

  /**
   * Move item from Cart to Wishlist.
   * Requires customer authentication, uses WishlistService, and removes item only after successful wishlist addition.
   */
  async moveToWishlist(customerId: string, itemId: string): Promise<CartDTO> {
    await connectToDatabase();
    const cart = await cartRepository.findActiveCartByCustomerId(customerId);
    if (!cart) {
      throw new NotFoundError("Cart", customerId);
    }

    const item = await cartRepository.findCartItemById(itemId);
    if (!item || item.cartId.toString() !== cart._id.toString()) {
      throw new AuthorizationError("Item does not belong to your shopping bag");
    }

    // 1. Add to wishlist using existing authoritative WishlistService
    await wishlistService.addToWishlist(customerId, item.productId.toString());

    // 2. Safely remove from cart
    await cartRepository.deleteCartItem(itemId);

    logger.info("Moved cart item to wishlist", {
      context: "CartService",
      metadata: { customerId, cartId: cart._id.toString(), itemId, productId: item.productId.toString() },
    });

    return this.getCart({ customerId });
  }

  /**
   * Merges an anonymous guest session cart into an authenticated customer's cart upon login.
   * Sums quantities for identical variants (capped at MAX_CART_ITEM_QUANTITY) and consumes guest cart.
   */
  async mergeGuestCart(customerId: string, guestSessionId: string): Promise<CartDTO> {
    await connectToDatabase();
    if (!customerId || !guestSessionId) {
      return this.getCart({ customerId });
    }

    const guestCart = await cartRepository.findActiveCartBySessionId(guestSessionId);
    if (!guestCart) {
      return this.getCart({ customerId });
    }

    const guestItems = await cartRepository.getCartItems(guestCart._id.toString());
    if (!guestItems.length) {
      await cartRepository.updateCartStatus(guestCart._id.toString(), CartStatus.CONVERTED);
      return this.getCart({ customerId });
    }

    const customerCart = await this.getOrCreateActiveCart({ customerId });

    await cartRepository.mergeGuestCartItems(
      guestCart._id.toString(),
      customerCart._id.toString(),
      MAX_CART_ITEM_QUANTITY
    );

    logger.info("Successfully merged guest cart into customer cart", {
      context: "CartService",
      metadata: { customerId, guestCartId: guestCart._id.toString(), customerCartId: customerCart._id.toString() },
    });

    return this.getCart({ customerId });
  }

  /**
   * Fast header badge count calculation
   */
  async getCartCount(identity: ViewerIdentity): Promise<{ itemCount: number }> {
    await connectToDatabase();
    const cart = await cartRepository.findActiveCart(identity);
    if (!cart) return { itemCount: 0 };

    const items = await cartRepository.getCartItems(cart._id.toString());
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return { itemCount: count };
  }

  /**
   * Apply a coupon code to the cart.
   * Validates coupon against cart items, subtotal, usage limits, and active date windows.
   */
  async applyCoupon(identity: ViewerIdentity, couponCode: string): Promise<CartDTO> {
    await connectToDatabase();
    if (!couponCode || !couponCode.trim()) {
      throw new ValidationError("Coupon code is required");
    }

    const normalizedCode = couponCode.trim().toUpperCase();

    // 1. Get or create active cart
    const cart = await this.getOrCreateActiveCart(identity);
    const cartData = await cartRepository.getCartWithItems(cart._id.toString());

    if (!cartData || !cartData.items.length) {
      throw new ValidationError("Cannot apply coupon to an empty cart");
    }

    // 2. Fetch products for items to evaluate targeting
    const productIds = Array.from(new Set(cartData.items.map((i) => i.productId.toString())));
    const variantIds = Array.from(new Set(cartData.items.map((i) => i.variantId.toString())));

    const [products, variants] = await Promise.all([
      ProductModel.find({ _id: { $in: productIds } }).lean<IProduct[]>(),
      ProductVariantModel.find({ _id: { $in: variantIds } }).lean<IProductVariant[]>(),
    ]);

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    let calculatedSubtotalMinor: MinorUnits = 0;
    const pricingItems = cartData.items.map((item) => {
      const prod = productMap.get(item.productId.toString());
      const variant = variantMap.get(item.variantId.toString());
      const unitPrice = variant?.sellingPrice ?? item.unitPriceSnapshot;
      calculatedSubtotalMinor += unitPrice * item.quantity;

      return {
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        quantity: item.quantity,
        unitPriceMinor: unitPrice,
        categoryIds: prod?.categoryIds?.map((c) => c.toString()) || [],
        collectionIds: prod?.collectionIds?.map((c) => c.toString()) || [],
        brandId: prod?.brandId?.toString(),
      };
    });

    // 3. Test coupon application via pricing engine
    const pricingContext = {
      customerId: cart.customerId?.toString(),
      cartId: cart._id.toString(),
      items: pricingItems,
      couponCode: normalizedCode,
      timestamp: new Date(),
      currency: "INR" as const,
    };

    const breakdown = await pricingService.calculateCartPricing(pricingContext);

    if (!breakdown.appliedCoupon) {
      throw new ValidationError(
        breakdown.couponValidationMessage || "This coupon is invalid or not applicable to your cart"
      );
    }

    // 4. Persist coupon association on cart
    await cartRepository.setCartCoupon(
      cart._id.toString(),
      breakdown.appliedCoupon.couponId ?? null,
      breakdown.appliedCoupon.code
    );

    await cartRepository.updateCartTotals(cart._id.toString(), {
      subtotal: breakdown.subtotalMinor,
      total: breakdown.grandTotalMinor,
      couponId: breakdown.appliedCoupon.couponId,
      couponCode: breakdown.appliedCoupon.code,
    });

    logger.info("Coupon applied to cart", {
      context: "CartService",
      cartId: cart._id.toString(),
      couponCode: normalizedCode,
      discountMinor: breakdown.couponDiscountMinor,
    });

    return this.getCart(identity);
  }

  /**
   * Remove currently applied coupon from cart. Idempotent operation.
   */
  async removeCoupon(identity: ViewerIdentity): Promise<CartDTO> {
    await connectToDatabase();
    const cart = await cartRepository.findActiveCart(identity);

    if (cart && (cart.couponCode || cart.couponId)) {
      await cartRepository.setCartCoupon(cart._id.toString(), null, null);
      logger.info("Coupon removed from cart", {
        context: "CartService",
        cartId: cart._id.toString(),
      });
    }

    return this.getCart(identity);
  }

  /**
   * Build empty CartDTO representation
   */
  private buildEmptyCartDTO(
    identity: ViewerIdentity,
    id: string = "empty",
    createdAt?: Date,
    updatedAt?: Date
  ): CartDTO {
    return {
      id,
      customerId: identity.customerId || undefined,
      sessionId: identity.sessionId || undefined,
      status: CartStatus.ACTIVE,
      items: [],
      itemCount: 0,
      distinctItemCount: 0,
      totals: {
        subtotalMinor: 0,
        subtotalMajor: 0,
        promotionDiscountMinor: 0,
        promotionDiscountMajor: 0,
        couponDiscountMinor: 0,
        couponDiscountMajor: 0,
        discountMinor: 0,
        discountMajor: 0,
        shippingMinor: 0,
        taxMinor: 0,
        grandTotalMinor: 0,
        grandTotalMajor: 0,
        currency: CART_CONFIG.CURRENCY,
      },
      couponCode: null,
      hasUnavailableItems: false,
      hasPriceChanges: false,
      createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
      updatedAt: updatedAt ? updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const cartService = new CartService();
