import { Schema } from "mongoose";
import { IWishlist, IWishlistItem } from "@/types/database";

export const WishlistSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "Default",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "wishlists",
  }
);

export const WishlistItemSchema = new Schema(
  {
    wishlistId: {
      type: Schema.Types.ObjectId,
      ref: "Wishlist",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "wishlist_items",
  }
);

// Compound unique to prevent duplicate wishlist items for same customer and product/variant
WishlistItemSchema.index({ customerId: 1, productId: 1, variantId: 1 }, { unique: true });
WishlistItemSchema.index({ wishlistId: 1, addedAt: -1 });
WishlistItemSchema.index({ customerId: 1, addedAt: -1 });
