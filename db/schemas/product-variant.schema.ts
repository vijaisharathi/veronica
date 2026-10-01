import { Schema } from "mongoose";
import { VariantStatus } from "@/constants/status";
import { IProductVariant } from "@/types/database";

export const ProductVariantSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
    },
    color: {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, trim: true, lowercase: true },
      hexCode: { type: String, required: true, trim: true, uppercase: true },
      secondaryHexCode: { type: String, trim: true, uppercase: true },
    },
    size: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    variantImages: [
      {
        type: String,
        trim: true,
      },
    ],
    priceOverride: {
      type: Boolean,
      default: false,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "MRP must be an integer minor unit (e.g., paise)",
      },
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Selling price must be an integer minor unit (e.g., paise)",
      },
    },
    costPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: (val: number | null | undefined) => val == null || Number.isInteger(val),
        message: "Cost price must be an integer minor unit (e.g., paise)",
      },
    },
    weightInGrams: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    status: {
      type: String,
      enum: Object.values(VariantStatus),
      default: VariantStatus.ACTIVE,
      required: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "product_variants",
  }
);

// Compound uniqueness: prevent duplicate color+size within the same product
ProductVariantSchema.index({ productId: 1, "color.name": 1, size: 1 }, { unique: true });
ProductVariantSchema.index({ productId: 1, "color.slug": 1, size: 1 }, { unique: true });
ProductVariantSchema.index({ productId: 1, active: 1, status: 1 });
ProductVariantSchema.index({ "color.slug": 1 });
ProductVariantSchema.index({ size: 1 });
ProductVariantSchema.index({ sellingPrice: 1 });

