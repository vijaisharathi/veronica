import { Schema } from "mongoose";
import { IServiceabilityRule } from "@/types/database";

export const ServiceabilityRuleSchema = new Schema<IServiceabilityRule>(
  {
    postalCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "IN",
      index: true,
    },
    serviceable: {
      type: Boolean,
      required: true,
      default: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      required: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    estimatedDeliveryDays: {
      type: Number,
      min: 1,
      max: 30,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "serviceability_rules",
  }
);

ServiceabilityRuleSchema.index({ postalCode: 1, country: 1 }, { unique: true });
ServiceabilityRuleSchema.index({ status: 1, serviceable: 1 });
