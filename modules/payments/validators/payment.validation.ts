/**
 * VÉRONA — Payment Input Validation Schemas
 */

import { z } from "zod";

export const CreatePaymentSchema = z.object({
  checkoutSessionId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid checkout session identifier format"),
  idempotencyKey: z
    .string()
    .trim()
    .max(128, "Idempotency key must not exceed 128 characters")
    .optional(),
});

export const VerifyPaymentSchema = z.object({
  paymentId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid payment identifier format"),
  razorpayOrderId: z
    .string()
    .trim()
    .min(1, "Razorpay order ID is required"),
  razorpayPaymentId: z
    .string()
    .trim()
    .min(1, "Razorpay payment ID is required"),
  razorpaySignature: z
    .string()
    .trim()
    .min(1, "Razorpay signature is required"),
});

export const PaymentIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid payment identifier format"),
});
