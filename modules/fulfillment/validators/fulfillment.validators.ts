/**
 * VÉRONA — Fulfillment & Shipping Validation Schemas (Phase 21)
 */

import { z } from "zod";
import { FulfillmentStatus, ShipmentStatus, ShipmentEventSource } from "@/constants/status";

export const createFulfillmentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  warehouseId: z.string().optional(),
});

export const allocateFulfillmentSchema = z.object({
  warehouseId: z.string().optional(),
});

export const confirmPickSchema = z.object({
  pickedItems: z
    .array(
      z.object({
        orderItemId: z.string().min(1, "Order item ID is required"),
        quantity: z.number().int().positive("Quantity must be greater than 0"),
      })
    )
    .min(1, "At least one picked item must be specified"),
});

export const createPackageSchema = z.object({
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1, "Order item ID is required"),
        variantId: z.string().min(1, "Variant ID is required"),
        sku: z.string().min(1, "SKU is required"),
        quantity: z.number().int().positive("Quantity must be greater than 0"),
      })
    )
    .min(1, "Package must contain at least one item"),
  weightGrams: z.number().int().positive("Weight in grams must be greater than 0"),
  lengthMm: z.number().int().positive("Length in mm must be positive").optional(),
  widthMm: z.number().int().positive("Width in mm must be positive").optional(),
  heightMm: z.number().int().positive("Height in mm must be positive").optional(),
});

export const createShipmentSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  serviceLevel: z.string().max(50).optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export const cancelFulfillmentSchema = z.object({
  reason: z
    .string()
    .min(3, "Cancellation reason must be at least 3 characters")
    .max(500, "Cancellation reason cannot exceed 500 characters"),
});

export const fulfillmentFilterSchema = z.object({
  warehouseId: z.string().optional(),
  status: z.nativeEnum(FulfillmentStatus).optional(),
  orderId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const shipmentFilterSchema = z.object({
  warehouseId: z.string().optional(),
  status: z.nativeEnum(ShipmentStatus).optional(),
  orderId: z.string().optional(),
  awbNumber: z.string().optional(),
  provider: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateShipmentStatusSchema = z.object({
  status: z.nativeEnum(ShipmentStatus, {
    errorMap: () => ({ message: "A valid shipment status is required" }),
  }),
  location: z.string().max(100).optional(),
  description: z.string().min(1, "Description is required").max(300),
  source: z.nativeEnum(ShipmentEventSource).default(ShipmentEventSource.ADMIN),
  providerStatus: z.string().max(100).optional(),
});

export type CreateFulfillmentSchemaType = z.infer<typeof createFulfillmentSchema>;
export type ConfirmPickSchemaType = z.infer<typeof confirmPickSchema>;
export type CreatePackageSchemaType = z.infer<typeof createPackageSchema>;
export type CreateShipmentSchemaType = z.infer<typeof createShipmentSchema>;
export type CancelFulfillmentSchemaType = z.infer<typeof cancelFulfillmentSchema>;
export type FulfillmentFilterSchemaType = z.infer<typeof fulfillmentFilterSchema>;
export type ShipmentFilterSchemaType = z.infer<typeof shipmentFilterSchema>;
export type UpdateShipmentStatusSchemaType = z.infer<typeof updateShipmentStatusSchema>;
