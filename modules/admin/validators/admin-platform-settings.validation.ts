/**
 * VÉRONA — Admin Platform Settings Validation Schemas (Phase 29)
 */

import { z } from "zod";
import { SystemSettingsCategory } from "@/constants/status";

// Blacklist pattern preventing injection of secrets into database settings
const FORBIDDEN_SECRET_KEYS = [
  /secret/i,
  /password/i,
  /private[_-]?key/i,
  /api[_-]?key/i,
  /token/i,
  /credential/i,
  /razorpay[_-]?(key|secret)/i,
  /clerk[_-]?(secret|key)/i,
  /resend[_-]?key/i,
];

export function isSecretSettingKey(key: string): boolean {
  return FORBIDDEN_SECRET_KEYS.some((pattern) => pattern.test(key));
}

export const AdminSettingUpdateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, "Key must be at least 2 characters")
    .max(100)
    .refine((val) => !isSecretSettingKey(val), {
      message: "Security violation: Secrets and credentials cannot be stored in platform settings",
    }),
  category: z.nativeEnum(SystemSettingsCategory),
  value: z.record(z.unknown()).or(z.string()).or(z.number()).or(z.boolean()),
  description: z.string().trim().max(500).optional(),
});

export type AdminSettingUpdateInput = z.infer<typeof AdminSettingUpdateSchema>;

// Strongly typed schemas for well-known setting categories
export const StoreSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(100),
  legalEntityName: z.string().trim().min(2).max(150),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().min(8).max(20),
  defaultCurrency: z.string().trim().length(3).default("INR"),
  defaultLocale: z.string().trim().default("en-IN"),
  defaultTimezone: z.string().trim().default("Asia/Kolkata"),
  storeAddress: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    country: z.string().trim().default("India"),
  }),
});

export const MaintenanceSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string().trim().max(500).default("VÉRONA is briefly undergoing scheduled maintenance. Please visit shortly."),
  allowedIps: z.array(z.string().trim()).default([]),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
});

export const FeatureFlagsSettingsSchema = z.object({
  enableReviews: z.boolean().default(true),
  enableWishlist: z.boolean().default(true),
  enableCouponDiscounts: z.boolean().default(true),
  enableInternationalShipping: z.boolean().default(false),
  enableReturnPickupScheduling: z.boolean().default(true),
});
