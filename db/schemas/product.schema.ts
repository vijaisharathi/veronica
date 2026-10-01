import { Schema } from "mongoose";
import { Gender, ProductStatus, ProductVisibility } from "@/constants/status";
import { IProduct } from "@/types/database";

export const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    categoryIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      required: true,
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: "Product must have at least one category",
      },
    },
    collectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "FashionCollection",
      },
    ],
    gender: {
      type: String,
      enum: Object.values(Gender),
      required: true,
      index: true,
    },
    productType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fabric: {
      type: String,
      trim: true,
    },
    fit: {
      type: String,
      trim: true,
    },
    pattern: {
      type: String,
      trim: true,
    },
    occasion: {
      type: String,
      trim: true,
    },
    season: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    images: [
      {
        url: { type: String, required: true, trim: true },
        alt: { type: String, trim: true },
        isPrimary: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    careInstructions: [
      {
        type: String,
        trim: true,
      },
    ],
    specifications: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }],
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(ProductVisibility),
      default: ProductVisibility.PUBLIC,
      required: true,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    bestseller: {
      type: Boolean,
      default: false,
      index: true,
    },
    newArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "products",
  }
);

// Compound Storefront Discovery Indexes (covering status, visibility, isDeleted)
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, categoryIds: 1, createdAt: -1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, collectionIds: 1, createdAt: -1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, brandId: 1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, gender: 1, createdAt: -1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, newArrival: 1, createdAt: -1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, featured: 1, createdAt: -1 });
ProductSchema.index({ status: 1, visibility: 1, isDeleted: 1, bestseller: 1, createdAt: -1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ categoryIds: 1, status: 1 });
ProductSchema.index({ collectionIds: 1 });
ProductSchema.index({ tags: 1 });

// Full-Text Search Index with relevance weighting
ProductSchema.index(
  {
    name: "text",
    tags: "text",
    productType: "text",
    fabric: "text",
    fit: "text",
    pattern: "text",
    occasion: "text",
    description: "text",
  },
  {
    weights: {
      name: 10,
      tags: 5,
      productType: 5,
      fabric: 4,
      fit: 4,
      pattern: 3,
      occasion: 3,
      description: 1,
    },
    name: "ProductFullTextIndex",
    default_language: "english",
  }
);
