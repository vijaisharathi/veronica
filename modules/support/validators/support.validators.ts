/**
 * VÉRONA — Support Request Validators (Phase 26)
 *
 * Implements strict Zod schema validation for ticket creation, replies,
 * internal notes, assignments, and status transitions.
 */

import { z } from "zod";
import {
  SupportCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/constants/status";

const SupportAttachmentInputSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  url: z.string().url().startsWith("https://", "Attachment URL must use secure HTTPS transport"),
  fileType: z.string().min(1).max(100).trim(),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024, "File size cannot exceed 10MB"),
  uploadedAt: z.string().optional(),
});

export const CreateTicketSchema = z.object({
  category: z.nativeEnum(SupportCategory, {
    errorMap: () => ({ message: "A valid support category must be selected." }),
  }),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters.")
    .max(200, "Subject cannot exceed 200 characters.")
    .trim(),
  message: z
    .string()
    .min(10, "Message description must be at least 10 characters.")
    .max(5000, "Message cannot exceed 5000 characters.")
    .trim(),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid order identifier format").optional(),
  shipmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid shipment identifier format").optional(),
  returnRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid return identifier format").optional(),
  refundId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid refund identifier format").optional(),
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product identifier format").optional(),
  attachments: z.array(SupportAttachmentInputSchema).max(5, "Maximum 5 attachments allowed").optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export const CustomerReplySchema = z.object({
  message: z
    .string()
    .min(1, "Reply message cannot be empty.")
    .max(5000, "Reply message cannot exceed 5000 characters.")
    .trim(),
  attachments: z.array(SupportAttachmentInputSchema).max(5, "Maximum 5 attachments allowed").optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export const AgentReplySchema = z.object({
  message: z
    .string()
    .min(1, "Agent reply cannot be empty.")
    .max(10000, "Agent reply cannot exceed 10000 characters.")
    .trim(),
  attachments: z.array(SupportAttachmentInputSchema).max(5, "Maximum 5 attachments allowed").optional(),
  idempotencyKey: z.string().max(100).optional(),
});

export const InternalNoteSchema = z.object({
  note: z
    .string()
    .min(1, "Internal note cannot be empty.")
    .max(10000, "Internal note cannot exceed 10000 characters.")
    .trim(),
  attachments: z.array(SupportAttachmentInputSchema).max(5, "Maximum 5 attachments allowed").optional(),
});

export const AssignTicketSchema = z.object({
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid staff identifier")
    .nullable()
    .optional(),
  assignedTeam: z.string().max(100).nullable().optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus, {
    errorMap: () => ({ message: "A valid ticket status must be provided." }),
  }),
  reason: z.string().max(500).optional(),
});

export const UpdatePrioritySchema = z.object({
  priority: z.nativeEnum(SupportTicketPriority, {
    errorMap: () => ({ message: "A valid ticket priority must be provided." }),
  }),
  reason: z.string().max(500).optional(),
});

export const ReopenTicketSchema = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters.").max(500).trim().optional(),
});

// Alias exports for route consistency
export const CreateCustomerTicketSchema = CreateTicketSchema;
export const UpdateTicketStatusSchema = UpdateStatusSchema;
export const UpdateTicketPrioritySchema = UpdatePrioritySchema;
