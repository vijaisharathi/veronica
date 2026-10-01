import { Schema } from "mongoose";
import { IBanner, IHomepageSection } from "@/types/database";

export const BannerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    desktopImage: {
      type: String,
      required: true,
      trim: true,
    },
    mobileImage: {
      type: String,
      trim: true,
    },
    ctaText: {
      type: String,
      trim: true,
    },
    ctaUrl: {
      type: String,
      trim: true,
    },
    placement: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "banners",
  }
);

BannerSchema.index({ placement: 1, active: 1, sortOrder: 1 });

export const HomepageSectionSchema = new Schema(
  {
    sectionType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    contentReferences: {
      type: Schema.Types.Mixed,
      default: {},
    },
    configuration: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sortOrder: {
      type: Number,
      default: 0,
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
    collection: "homepage_sections",
  }
);

HomepageSectionSchema.index({ active: 1, sortOrder: 1 });

export const EditorialStorySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
    },
    heroImage: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }],
    },
  },
  {
    timestamps: true,
    collection: "editorial_stories",
  }
);

EditorialStorySchema.index({ status: 1, active: 1, sortOrder: 1 });
EditorialStorySchema.index({ slug: 1, isDeleted: 1 });
