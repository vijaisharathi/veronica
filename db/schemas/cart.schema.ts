import { Schema } from "mongoose";
import { CartStatus } from "@/constants/status";
import { ICart, ICartItem } from "@/types/database";

export const CartSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      sparse: true,
      index: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CartStatus),
      default: CartStatus.ACTIVE,
      required: true,
      index: true,
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Subtotal must be an integer minor unit (e.g., paise)",
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Discount must be an integer minor unit (e.g., paise)",
      },
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Shipping must be an integer minor unit (e.g., paise)",
      },
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Tax must be an integer minor unit (e.g., paise)",
      },
    },
    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Total must be an integer minor unit (e.g., paise)",
      },
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
    collection: "carts",
  }
);

CartSchema.index({ customerId: 1, status: 1 });
CartSchema.index({ sessionId: 1, status: 1 });

export const CartItemSchema = new Schema(
  {
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
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
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    unitPriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Unit price snapshot must be an integer minor unit (e.g., paise)",
      },
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    variantSnapshot: {
      color: { type: String, required: true },
      size: { type: String, required: true },
      sku: { type: String, required: true },
    },
    imageSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "cart_items",
  }
);

CartItemSchema.index({ cartId: 1, variantId: 1 }, { unique: true });
