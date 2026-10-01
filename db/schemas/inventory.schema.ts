import { Schema } from "mongoose";
import {
  InventoryStatus,
  StockMovementType,
  StockAdjustmentReason,
  StockReservationStatus,
} from "@/constants/status";
import {
  IInventoryItem,
  IStockMovement,
  IStockReservation,
} from "@/types/database";

export const InventoryItemSchema = new Schema(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      index: true,
    },
    quantityOnHand: {
      type: Number,
      min: [0, "Quantity on hand cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Quantity on hand must be an integer",
      },
    },
    quantityReserved: {
      type: Number,
      min: [0, "Quantity reserved cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Quantity reserved must be an integer",
      },
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, "Available quantity cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Available quantity must be an integer",
      },
    },
    reservedQuantity: {
      type: Number,
      required: true,
      min: [0, "Reserved quantity cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Reserved quantity must be an integer",
      },
    },
    damagedQuantity: {
      type: Number,
      required: true,
      min: [0, "Damaged quantity cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Damaged quantity must be an integer",
      },
    },
    incomingQuantity: {
      type: Number,
      required: true,
      min: [0, "Incoming quantity cannot be negative"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Incoming quantity must be an integer",
      },
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 5,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(InventoryStatus),
      default: InventoryStatus.IN_STOCK,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "inventory_items",
  }
);

// Consistency & invariant pre-validation hook
InventoryItemSchema.pre("validate", function (next) {
  // If quantityOnHand not explicitly set but availableQuantity & reservedQuantity provided
  if (this.quantityOnHand === 0 && this.quantityReserved === 0) {
    if (this.availableQuantity !== undefined && this.availableQuantity > 0) {
      this.quantityOnHand = (this.availableQuantity || 0) + (this.reservedQuantity || 0);
    }
    if (this.reservedQuantity !== undefined && this.reservedQuantity > 0) {
      this.quantityReserved = this.reservedQuantity;
    }
  } else if (this.quantityOnHand !== undefined && this.quantityOnHand > 0) {
    // Sync availableQuantity & reservedQuantity from onHand & reserved
    this.reservedQuantity = this.quantityReserved || 0;
    this.availableQuantity = this.quantityOnHand - (this.quantityReserved || 0);
  }

  if (this.lowStockThreshold === undefined && this.reorderLevel !== undefined) {
    this.lowStockThreshold = this.reorderLevel;
  } else if (this.reorderLevel === undefined && this.lowStockThreshold !== undefined) {
    this.reorderLevel = this.lowStockThreshold;
  }

  // Update status automatically based on available stock if availableQuantity is non-negative
  if (typeof this.availableQuantity === "number" && this.availableQuantity >= 0) {
    if (this.availableQuantity <= 0) {
      this.status = InventoryStatus.OUT_OF_STOCK;
    } else if (this.availableQuantity <= (this.lowStockThreshold || 5)) {
      this.status = InventoryStatus.LOW_STOCK;
    } else {
      this.status = InventoryStatus.IN_STOCK;
    }
  }

  next();
});

// One inventory record per variant per warehouse
InventoryItemSchema.index({ warehouseId: 1, variantId: 1 }, { unique: true });
InventoryItemSchema.index({ variantId: 1, status: 1 });

export const StockMovementSchema = new Schema(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(StockMovementType),
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    beforeQuantity: {
      type: Number,
      required: true,
    },
    afterQuantity: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    adjustmentReason: {
      type: String,
      enum: Object.values(StockAdjustmentReason),
      default: null,
    },
    performedBy: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "stock_movements",
  }
);

StockMovementSchema.index({ variantId: 1, timestamp: -1 });
StockMovementSchema.index({ warehouseId: 1, timestamp: -1 });

export const StockReservationSchema = new Schema(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    referenceType: {
      type: String,
      required: true,
      trim: true,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Reserved quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Reserved quantity must be an integer",
      },
    },
    status: {
      type: String,
      enum: Object.values(StockReservationStatus),
      default: StockReservationStatus.ACTIVE,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "0s" },
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "stock_reservations",
  }
);

StockReservationSchema.index({ variantId: 1, status: 1 });
StockReservationSchema.index({ status: 1, expiresAt: 1 });
