import { Schema } from "mongoose";
import { WarehouseStatus } from "@/constants/status";
import { IWarehouse } from "@/types/database";

export const WarehouseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    address: {
      addressLine1: { type: String, required: true, trim: true },
      addressLine2: { type: String, trim: true },
      landmark: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true, default: "India" },
      pincode: { type: String, required: true, trim: true },
    },
    contact: {
      phone: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      contactPerson: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: Object.values(WarehouseStatus),
      default: WarehouseStatus.ACTIVE,
      required: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    operatingStatus: {
      type: String,
      default: "OPERATIONAL",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "warehouses",
  }
);
