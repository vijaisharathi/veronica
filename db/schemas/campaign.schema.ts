import { Schema } from "mongoose";
import { CampaignStatus, DiscountType } from "@/constants/status";
import { ICampaign } from "@/types/database";

export const CampaignSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
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
      trim: true,
    },
    banner: {
      type: String,
      trim: true,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      required: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    discountConfig: {
      type: {
        type: String,
        enum: Object.values(DiscountType),
        required: true,
      },
      value: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    targetCategoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    targetProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    targetCollectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Collection",
      },
    ],
    targetBrandIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Brand",
      },
    ],
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    stackable: {
      type: Boolean,
      default: false,
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
    collection: "campaigns",
  }
);
