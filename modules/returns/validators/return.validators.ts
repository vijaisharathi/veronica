/**
 * VÉRONA — Return & Exchange Input Validators (Phase 22)
 *
 * Strict Zod schemas validating customer and staff mutation payloads.
 */

import { z } from "zod";
import {
  ReturnReason,
  InspectionResult,
  ReturnItemCondition,
  ReturnDisposition,
} from "@/constants/status";

export const CreateReturnItemSchema = z.object({
  orderItemId: z.string().min(1, "Order item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reason: z.nativeEnum(ReturnReason, {
    errorMap: () => ({ message: "A valid return reason code must be selected" }),
  }),
  condition: z.nativeEnum(ReturnItemCondition).optional(),
});

export const CreateReturnRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.nativeEnum(ReturnReason, {
    errorMap: () => ({ message: "A valid return reason code must be selected" }),
  }),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  evidenceImages: z.array(z.string().url("Evidence image must be a valid URL")).max(5, "Maximum 5 evidence images allowed").optional(),
  items: z.array(CreateReturnItemSchema).min(1, "At least one item must be selected for return"),
  pickupAddressId: z.string().optional(),
});

export const CreateExchangeRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  originalOrderItemId: z.string().min(1, "Original order item ID is required"),
  requestedVariantId: z.string().min(1, "Replacement variant ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reason: z.nativeEnum(ReturnReason, {
    errorMap: () => ({ message: "A valid exchange reason code must be selected" }),
  }),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  evidenceImages: z.array(z.string().url("Evidence image must be a valid URL")).max(5, "Maximum 5 evidence images allowed").optional(),
  pickupAddressId: z.string().optional(),
});

export const ReviewReturnSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
  warehouseId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const SchedulePickupSchema = z.object({
  scheduledDate: z.string().datetime().or(z.date()).optional(),
  provider: z.string().max(100).optional(),
  instructions: z.string().max(500).optional(),
});

export const ConfirmPickupSchema = z.object({
  actualDate: z.string().datetime().or(z.date()).optional(),
  trackingNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const ReceiveReturnSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required for receiving"),
  packageReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const InspectionItemSchema = z.object({
  orderItemId: z.string().min(1, "Order item ID is required"),
  result: z.nativeEnum(InspectionResult, {
    errorMap: () => ({ message: "Inspection result must be PASSED, FAILED, or PARTIAL" }),
  }),
  condition: z.nativeEnum(ReturnItemCondition, {
    errorMap: () => ({ message: "A valid physical condition must be specified" }),
  }),
  notes: z.string().max(1000).optional(),
  disposition: z.nativeEnum(ReturnDisposition).optional(),
});

export const CompleteInspectionSchema = z.object({
  items: z.array(InspectionItemSchema).min(1, "Inspection results must be provided for all returned items"),
  notes: z.string().max(1000).optional(),
});

export const ItemDispositionSchema = z.object({
  orderItemId: z.string().min(1, "Order item ID is required"),
  disposition: z.nativeEnum(ReturnDisposition, {
    errorMap: () => ({ message: "A valid disposition (RESTOCK, DAMAGED, DEFECTIVE, QUARANTINE, DISPOSE) must be selected" }),
  }),
  notes: z.string().max(1000).optional(),
});

export const AssignDispositionSchema = z.object({
  items: z.array(ItemDispositionSchema).min(1, "Disposition must be assigned for items"),
  notes: z.string().max(1000).optional(),
});

export const ReviewExchangeSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});
