import { Schema } from "mongoose";
import { OrderStatus, PaymentStatus } from "@/constants/status";
import { IOrder } from "@/types/database";

const OrderItemSnapshotSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Unit price must be an integer minor unit (e.g., paise)",
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
    tax: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Tax must be an integer minor unit (e.g., paise)",
      },
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Final price must be an integer minor unit (e.g., paise)",
      },
    },
  },
  { _id: true }
);

const OrderAddressSnapshotSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const OrderPricingSnapshotSchema = new Schema(
  {
    subtotal: {
      type: Number,
      required: true,
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
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Coupon discount must be an integer minor unit (e.g., paise)",
      },
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Total discount must be an integer minor unit (e.g., paise)",
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
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Total must be an integer minor unit (e.g., paise)",
      },
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      trim: true,
    },
  },
  { _id: false }
);

const OrderCouponSnapshotSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    discountMinor: { type: Number, required: true, min: 0 },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
  },
  { _id: false }
);

const OrderPaymentDetailsSnapshotSchema = new Schema(
  {
    provider: { type: String, required: true, trim: true },
    providerOrderId: { type: String, trim: true },
    providerPaymentId: { type: String, trim: true },
    currency: { type: String, required: true, default: "INR" },
    paidAmountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export const OrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    checkoutSessionId: {
      type: Schema.Types.ObjectId,
      ref: "CheckoutSession",
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [OrderItemSnapshotSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: "Order must contain at least one item",
      },
    },
    pricing: {
      type: OrderPricingSnapshotSchema,
      required: true,
    },
    shippingAddress: {
      type: OrderAddressSnapshotSchema,
      required: true,
    },
    billingAddress: {
      type: OrderAddressSnapshotSchema,
      required: true,
    },
    coupon: {
      type: OrderCouponSnapshotSchema,
      default: null,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
      index: true,
    },
    paymentDetails: {
      type: OrderPaymentDetailsSnapshotSchema,
      default: null,
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CONFIRMED,
      required: true,
      index: true,
    },
    cancellation: {
      reason: { type: String, trim: true },
      cancelledAt: { type: Date },
      cancelledBy: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "orders",
  }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paymentId: 1 }, { unique: true, sparse: true });
