import { z } from "zod";
import { StockAdjustmentReason, WarehouseStatus, StockMovementType, StockReservationStatus } from "@/constants/status";

export const receiveStockSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.number().int("Quantity must be an integer").positive("Quantity must be greater than 0"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  sku: z.string().optional(),
  productId: z.string().optional(),
});

export const adjustStockSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  variantId: z.string().min(1, "Variant ID is required"),
  quantityDelta: z.number().int("Quantity adjustment must be an integer").refine((val) => val !== 0, {
    message: "Quantity adjustment delta cannot be 0",
  }),
  reason: z.nativeEnum(StockAdjustmentReason, {
    errorMap: () => ({ message: "A valid adjustment reason is required" }),
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const reserveStockSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  warehouseId: z.string().optional(),
  quantity: z.number().int("Quantity must be an integer").positive("Quantity must be greater than 0"),
  referenceType: z.string().min(1, "Reference type is required"),
  referenceId: z.string().min(1, "Reference ID is required"),
  expiresInMinutes: z.number().int().min(1).max(1440).default(30),
  metadata: z.record(z.unknown()).optional(),
});

export const releaseStockSchema = z.object({
  reservationId: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  reason: z.string().optional(),
}).refine((data) => data.reservationId || (data.referenceType && data.referenceId), {
  message: "Either reservationId or (referenceType and referenceId) must be provided",
});

export const consumeStockSchema = z.object({
  reservationId: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
}).refine((data) => data.reservationId || (data.referenceType && data.referenceId), {
  message: "Either reservationId or (referenceType and referenceId) must be provided",
});

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(3, "Warehouse code must be at least 3 characters")
    .max(20, "Warehouse code cannot exceed 20 characters")
    .regex(/^[A-Z0-9_-]+$/, "Warehouse code must consist of uppercase letters, numbers, hyphens or underscores"),
  name: z.string().min(2, "Warehouse name must be at least 2 characters").max(100),
  address: z.object({
    addressLine1: z.string().min(3, "Address line 1 is required"),
    addressLine2: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    country: z.string().default("India"),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  }),
  contact: z.object({
    phone: z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, "Phone must be a valid 10-digit Indian phone number"),
    email: z.string().email("Valid contact email is required"),
    contactPerson: z.string().min(2, "Contact person name is required"),
  }),
  status: z.nativeEnum(WarehouseStatus).default(WarehouseStatus.ACTIVE),
  operatingStatus: z.string().default("OPERATIONAL"),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().omit({ code: true });

export const inventoryQuerySchema = z.object({
  warehouseId: z.string().optional(),
  productId: z.string().optional(),
  status: z.string().optional(),
  lowStockOnly: z.enum(["true", "false"]).optional().transform((val) => val === "true"),
  outOfStockOnly: z.enum(["true", "false"]).optional().transform((val) => val === "true"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const movementQuerySchema = z.object({
  warehouseId: z.string().optional(),
  variantId: z.string().optional(),
  type: z.nativeEnum(StockMovementType).optional(),
  referenceId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const reservationQuerySchema = z.object({
  warehouseId: z.string().optional(),
  variantId: z.string().optional(),
  status: z.nativeEnum(StockReservationStatus).optional(),
  referenceId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
