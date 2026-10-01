/**
 * VÉRONA — Fulfillment Domain Types & DTOs (Phase 21)
 */

import { FulfillmentStatus, ShipmentStatus, ShipmentEventSource } from "@/constants/status";
import { MinorUnits } from "@/types/database";

// ── Fulfillment DTOs ──────────────────────────────────────────────────────────

export interface FulfillmentItemDTO {
  orderItemId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  color: string;
  size: string;
  orderedQuantity: number;
  fulfilledQuantity: number;
}

export interface FulfillmentDTO {
  id: string;
  fulfillmentNumber: string;
  orderId: string;
  warehouseId: string;
  warehouseCode?: string;
  status: FulfillmentStatus;
  items: FulfillmentItemDTO[];
  assignedTo?: string;
  allocatedAt?: string;
  pickedAt?: string;
  pickedBy?: string;
  packedAt?: string;
  packedBy?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Package DTOs ──────────────────────────────────────────────────────────────

export interface PackageItemDTO {
  orderItemId: string;
  variantId: string;
  sku: string;
  quantity: number;
}

export interface PackageDTO {
  id: string;
  packageNumber: string;
  fulfillmentId: string;
  orderId: string;
  items: PackageItemDTO[];
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ── Shipment DTOs ─────────────────────────────────────────────────────────────

export interface ShipmentEventDTO {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  providerStatus?: string;
  location?: string;
  description: string;
  eventTime: string;
  source: ShipmentEventSource;
}

export interface ShipmentDTO {
  id: string;
  shipmentNumber: string;
  orderId: string;
  fulfillmentId: string;
  packageId?: string;
  warehouseId: string;
  provider: string;
  providerShipmentId?: string;
  awbNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  serviceLevel?: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  events?: ShipmentEventDTO[];
  createdAt: string;
  updatedAt: string;
}

// ── Customer Tracking DTO ─────────────────────────────────────────────────────

export interface CustomerTrackingTimelineStep {
  status: string;
  label: string;
  description?: string;
  timestamp?: string;
  location?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface CustomerShipmentTrackingDTO {
  shipmentNumber: string;
  awbNumber?: string;
  trackingUrl?: string;
  provider: string;
  status: ShipmentStatus;
  statusLabel: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items: { sku: string; productName: string; color: string; size: string; quantity: number }[];
  timeline: CustomerTrackingTimelineStep[];
}

export interface OrderTrackingDTO {
  orderNumber: string;
  orderStatus: string;
  shipments: CustomerShipmentTrackingDTO[];
}

// ── Service Input Contracts ───────────────────────────────────────────────────

export interface CreateFulfillmentInput {
  orderId: string;
  warehouseId?: string;
}

export interface ConfirmPickInput {
  fulfillmentId: string;
  pickedItems: { orderItemId: string; quantity: number }[];
  actor: string;
}

export interface CreatePackageInput {
  fulfillmentId: string;
  items: { orderItemId: string; variantId: string; sku: string; quantity: number }[];
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  actor: string;
}

export interface CreateShipmentInput {
  fulfillmentId: string;
  packageId: string;
  serviceLevel?: string;
  idempotencyKey?: string;
}

export interface FulfillmentFilterOptions {
  warehouseId?: string;
  status?: FulfillmentStatus;
  orderId?: string;
  search?: string;
}

export interface ShipmentFilterOptions {
  warehouseId?: string;
  status?: ShipmentStatus;
  orderId?: string;
  awbNumber?: string;
  provider?: string;
}

// ── Shipping Provider Contracts ───────────────────────────────────────────────

export interface ShippingProviderCapabilities {
  createShipment: boolean;
  cancelShipment: boolean;
  trackShipment: boolean;
  generateLabel: boolean;
  registerPickup: boolean;
}

export interface CreateShipmentProviderRequest {
  orderId: string;
  shipmentNumber: string;
  warehouseId: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  serviceLevel?: string;
  idempotencyKey?: string;
}

export interface CreateShipmentProviderResponse {
  success: boolean;
  providerShipmentId?: string;
  awbNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  error?: string;
  errorCode?: string;
}

export interface TrackShipmentProviderResponse {
  success: boolean;
  status?: string;
  events?: {
    status: string;
    location?: string;
    description: string;
    eventTime: string;
    eventId?: string;
  }[];
  error?: string;
}
