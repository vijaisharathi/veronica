import { CartModel, CartItemModel } from "@/db/models";
import { ICart, ICartItem } from "@/types/database";
import { CartStatus } from "@/constants/status";
import { ViewerIdentity } from "./recently-viewed.repository";

export interface CartWithItems {
  cart: ICart;
  items: ICartItem[];
}

export class CartRepository {
  /**
   * Find active cart by customer ID
   */
  async findActiveCartByCustomerId(customerId: string): Promise<ICart | null> {
    return CartModel.findOne({ customerId, status: CartStatus.ACTIVE }).lean<ICart>();
  }

  /**
   * Find active cart by session ID (guest users)
   */
  async findActiveCartBySessionId(sessionId: string): Promise<ICart | null> {
    return CartModel.findOne({ sessionId, status: CartStatus.ACTIVE }).lean<ICart>();
  }

  /**
   * Find active cart by viewer identity (Customer ID if authenticated, else Session ID)
   */
  async findActiveCart(identity: ViewerIdentity): Promise<ICart | null> {
    if (identity.customerId) {
      return this.findActiveCartByCustomerId(identity.customerId);
    }
    if (identity.sessionId) {
      return this.findActiveCartBySessionId(identity.sessionId);
    }
    return null;
  }

  /**
   * Create a new active cart for a customer or guest session
   */
  async createActiveCart(identity: ViewerIdentity): Promise<ICart> {
    const cart = new CartModel({
      customerId: identity.customerId || undefined,
      sessionId: identity.sessionId || undefined,
      status: CartStatus.ACTIVE,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 0,
    });
    const saved = await cart.save();
    return saved.toObject() as ICart;
  }

  /**
   * Get all items in a cart
   */
  async getCartItems(cartId: string): Promise<ICartItem[]> {
    return CartItemModel.find({ cartId }).sort({ createdAt: 1 }).lean<ICartItem[]>();
  }

  /**
   * Get cart along with items
   */
  async getCartWithItems(cartId: string): Promise<CartWithItems | null> {
    const cart = await CartModel.findById(cartId).lean<ICart>();
    if (!cart) return null;
    const items = await CartItemModel.find({ cartId }).sort({ createdAt: 1 }).lean<ICartItem[]>();
    return { cart, items };
  }

  /**
   * Find a specific cart item by variant in a cart
   */
  async findCartItemByVariant(cartId: string, variantId: string): Promise<ICartItem | null> {
    return CartItemModel.findOne({ cartId, variantId }).lean<ICartItem>();
  }

  /**
   * Find a cart item by item ID
   */
  async findCartItemById(itemId: string): Promise<ICartItem | null> {
    return CartItemModel.findById(itemId).lean<ICartItem>();
  }

  /**
   * Create a new cart item
   */
  async createCartItem(data: Partial<ICartItem>): Promise<ICartItem> {
    const item = new CartItemModel(data);
    const saved = await item.save();
    return saved.toObject() as ICartItem;
  }

  /**
   * Update an existing cart item (e.g. quantity or updated snapshot)
   */
  async updateCartItem(itemId: string, data: Partial<ICartItem>): Promise<ICartItem | null> {
    return CartItemModel.findByIdAndUpdate(
      itemId,
      { $set: data },
      { new: true }
    ).lean<ICartItem>();
  }

  /**
   * Delete an item from cart
   */
  async deleteCartItem(itemId: string): Promise<boolean> {
    const res = await CartItemModel.deleteOne({ _id: itemId });
    return res.deletedCount > 0;
  }

  /**
   * Remove all items from cart (e.g. upon explicit cart clear)
   */
  async clearCartItems(cartId: string): Promise<number> {
    const res = await CartItemModel.deleteMany({ cartId });
    await CartModel.updateOne(
      { _id: cartId },
      { $set: { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, couponId: null, couponCode: null } }
    );
    return res.deletedCount;
  }

  async updateCartTotals(
    cartId: string,
    totals: {
      subtotal: number;
      total: number;
      discount?: number;
      shipping?: number;
      tax?: number;
      couponId?: string | null;
      couponCode?: string | null;
    }
  ): Promise<void> {
    const updateSet: Record<string, unknown> = {
      subtotal: totals.subtotal,
      total: totals.total,
      discount: totals.discount ?? 0,
      shipping: totals.shipping ?? 0,
      tax: totals.tax ?? 0,
    };

    if (totals.couponId !== undefined) updateSet.couponId = totals.couponId;
    if (totals.couponCode !== undefined) updateSet.couponCode = totals.couponCode;

    await CartModel.updateOne({ _id: cartId }, { $set: updateSet });
  }

  /**
   * Set or remove coupon on active cart
   */
  async setCartCoupon(
    cartId: string,
    couponId: string | null,
    couponCode: string | null
  ): Promise<void> {
    await CartModel.updateOne(
      { _id: cartId },
      { $set: { couponId, couponCode } }
    );
  }

  /**
   * Merge guest cart items into customer cart
   */
  async mergeGuestCartItems(
    guestCartId: string,
    customerCartId: string,
    maxQuantity: number
  ): Promise<void> {
    const guestItems = await CartItemModel.find({ cartId: guestCartId }).lean<ICartItem[]>();
    if (!guestItems.length) return;

    for (const gItem of guestItems) {
      const existingCustomerItem = await CartItemModel.findOne({
        cartId: customerCartId,
        variantId: gItem.variantId,
      });

      if (existingCustomerItem) {
        // Increment quantity up to max quantity
        const newQuantity = Math.min(existingCustomerItem.quantity + gItem.quantity, maxQuantity);
        await CartItemModel.updateOne(
          { _id: existingCustomerItem._id },
          { $set: { quantity: newQuantity } }
        );
        // Delete redundant guest item
        await CartItemModel.deleteOne({ _id: gItem._id });
      } else {
        // Re-assign item to the customer cart
        await CartItemModel.updateOne(
          { _id: gItem._id },
          { $set: { cartId: customerCartId } }
        );
      }
    }

    // Mark guest cart as converted
    await CartModel.updateOne(
      { _id: guestCartId },
      { $set: { status: CartStatus.CONVERTED } }
    );
  }

  /**
   * Update cart status (e.g. ACTIVE -> CONVERTED / ABANDONED)
   */
  async updateCartStatus(cartId: string, status: CartStatus): Promise<void> {
    await CartModel.updateOne({ _id: cartId }, { $set: { status } });
  }
}

export const cartRepository = new CartRepository();
