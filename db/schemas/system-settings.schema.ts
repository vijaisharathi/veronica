import { Schema } from "mongoose";
import { SystemSettingsCategory } from "@/constants/status";
import { ISystemSettings } from "@/types/database";

export const SystemSettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(SystemSettingsCategory),
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "system_settings",
  }
);
