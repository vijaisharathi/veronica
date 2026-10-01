import { Schema } from "mongoose";
import { FulfillmentStatus, ShipmentStatus, ShipmentEventSource } from "@/constants/status";
import { IFulfillment, IPackage, IShipment, IShipmentEvent, IShippingWebhookEvent } from "@/types/database";

// ── Fulfillment Item Sub-Schema ───────────────────────────────────────────────
const FulfillmentItemSchema = new Schema(
  {
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    productName: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    orderedQuantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: "Quantity must be an integer" } },
    fulfilledQuantity: { type: Number, required: true, min: 0, default: 0, validate: { validator: Number.isInteger, message: "Quantity must be an integer" } },
  },
  { _id: false }
);

// ── Fulfillment Schema ────────────────────────────────────────────────────────
export const FulfillmentSchema = new Schema(
  {
    fulfillmentNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
    status: { type: String, enum: Object.values(FulfillmentStatus), default: FulfillmentStatus.PENDING, required: true, index: true },
    items: { type: [FulfillmentItemSchema], required: true, validate: { validator: (v: unknown[]) => v.length > 0, message: "Fulfillment must have at least one item" } },
    assignedTo: { type: String, default: null },
    allocatedAt: { type: Date, default: null },
    pickingStartedAt: { type: Date, default: null },
    pickedAt: { type: Date, default: null },
    pickedBy: { type: String, default: null },
    packingStartedAt: { type: Date, default: null },
    packedAt: { type: Date, default: null },
    packedBy: { type: String, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, default: null },
    cancellationReason: { type: String, default: null, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "fulfillments" }
);
FulfillmentSchema.index({ orderId: 1, warehouseId: 1 });
FulfillmentSchema.index({ status: 1, createdAt: -1 });

// ── Package Item Sub-Schema ───────────────────────────────────────────────────
const PackageItemSchema = new Schema(
  {
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: "Quantity must be an integer" } },
  },
  { _id: false }
);

// ── Package Schema ────────────────────────────────────────────────────────────
export const PackageSchema = new Schema(
  {
    packageNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    fulfillmentId: { type: Schema.Types.ObjectId, ref: "Fulfillment", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    items: { type: [PackageItemSchema], required: true, validate: { validator: (v: unknown[]) => v.length > 0, message: "Package must have at least one item" } },
    weightGrams: { type: Number, required: true, min: 1 },
    lengthMm: { type: Number, default: null, min: 1 },
    widthMm: { type: Number, default: null, min: 1 },
    heightMm: { type: Number, default: null, min: 1 },
    status: { type: String, enum: ["CREATED", "SEALED", "LABELLED", "SHIPPED"], default: "CREATED", required: true },
  },
  { timestamps: true, collection: "packages" }
);

// ── Shipment Schema ───────────────────────────────────────────────────────────
export const ShipmentSchema = new Schema(
  {
    shipmentNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    fulfillmentId: { type: Schema.Types.ObjectId, ref: "Fulfillment", required: true, index: true },
    packageId: { type: Schema.Types.ObjectId, ref: "Package", default: null },
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
    provider: { type: String, required: true, trim: true },
    providerShipmentId: { type: String, default: null, trim: true, sparse: true, index: true },
    awbNumber: { type: String, default: null, trim: true, sparse: true, index: true },
    trackingUrl: { type: String, default: null, trim: true },
    status: { type: String, enum: Object.values(ShipmentStatus), default: ShipmentStatus.CREATED, required: true, index: true },
    serviceLevel: { type: String, default: null, trim: true },
    estimatedDeliveryDate: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    idempotencyKey: { type: String, default: null, trim: true, sparse: true, unique: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "shipments" }
);
ShipmentSchema.index({ provider: 1, providerShipmentId: 1 });

// ── Shipment Event Schema ─────────────────────────────────────────────────────
export const ShipmentEventSchema = new Schema(
  {
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true, index: true },
    status: { type: String, enum: Object.values(ShipmentStatus), required: true },
    providerStatus: { type: String, default: null, trim: true },
    location: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    eventTime: { type: Date, default: Date.now, index: true },
    source: { type: String, enum: Object.values(ShipmentEventSource), required: true, default: ShipmentEventSource.SYSTEM },
    providerEventId: { type: String, default: null, trim: true },
    rawReference: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "shipment_events" }
);
ShipmentEventSchema.index({ shipmentId: 1, eventTime: -1 });
ShipmentEventSchema.index({ providerEventId: 1 }, { sparse: true });

// ── Shipping Webhook Event Schema ─────────────────────────────────────────────
export const ShippingWebhookEventSchema = new Schema(
  {
    provider: { type: String, required: true, trim: true, index: true },
    eventId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", default: null },
    providerShipmentId: { type: String, default: null, trim: true },
    awbNumber: { type: String, default: null, trim: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["PENDING", "PROCESSED", "FAILED", "DUPLICATE"], default: "PENDING", required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
    error: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "shipping_webhook_events" }
);
ShippingWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
