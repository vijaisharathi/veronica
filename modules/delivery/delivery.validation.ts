/**
 * VÉRONA — Delivery & Serviceability Validation Schemas
 */

import { z } from "zod";

const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const CheckServiceabilitySchema = z.object({
  postalCode: z
    .string()
    .trim()
    .refine((val) => INDIAN_PINCODE_REGEX.test(val.replace(/\s+/g, "")), {
      message: "Please enter a valid 6-digit Indian PIN code (cannot start with 0)",
    })
    .transform((val) => val.replace(/\s+/g, "")),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .default("IN")
    .transform((val) => (val && val.length > 0 ? val : "IN")),
});

export const CreateServiceabilityRuleSchema = z.object({
  postalCode: z
    .string()
    .trim()
    .refine((val) => INDIAN_PINCODE_REGEX.test(val.replace(/\s+/g, "")), {
      message: "Postal code must be a valid 6-digit Indian PIN code",
    })
    .transform((val) => val.replace(/\s+/g, "")),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(3)
    .default("IN"),
  serviceable: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  estimatedDeliveryDays: z.number().int().min(1).max(30).optional(),
  reason: z.string().trim().max(250).optional(),
});

export const UpdateServiceabilityRuleSchema = z.object({
  serviceable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  estimatedDeliveryDays: z.number().int().min(1).max(30).optional(),
  reason: z.string().trim().max(250).optional(),
});

export const RuleIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid serviceability rule identifier format"),
});
