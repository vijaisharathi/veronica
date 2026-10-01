/**
 * VÉRONA — Customer Address Validation & Normalization
 *
 * Implements strict server-side validation and normalization rules for Indian addresses.
 * Sanitizes input, verifies 6-digit Indian PIN codes, checks mobile telephone numbers,
 * and validates state names against the authoritative Indian States registry.
 */

import { z } from "zod";
import { AddressType } from "@/constants/status";
import { isValidIndiaState, normalizeIndiaState } from "@/constants/india-states";

// Indian Mobile Phone: 10 digits starting with 6, 7, 8, or 9 (with optional +91, 91, or 0 prefix)
const INDIAN_PHONE_REGEX = /^(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6-9]\d{9}$/;

// Indian Postal Code: 6 digits, first digit cannot be 0 (range 1-9)
const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/**
 * Normalizes an Indian mobile phone number into "+91 XXXXXXXXXX" format.
 */
export function normalizeIndianPhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, strip country code to get 10-digit number
  let core10 = digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    core10 = digitsOnly.slice(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    core10 = digitsOnly.slice(1);
  }
  return `+91 ${core10}`;
}

/**
 * Validates and normalizes 6-digit Indian PIN code.
 */
export function validateAndNormalizePincode(rawPincode: string): string {
  const cleaned = rawPincode.trim().replace(/\s+/g, "");
  if (!INDIAN_PINCODE_REGEX.test(cleaned)) {
    throw new Error("Invalid 6-digit Indian PIN code format");
  }
  return cleaned;
}

export const CreateAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z
    .string()
    .trim()
    .refine((val) => INDIAN_PHONE_REGEX.test(val.replace(/\s+/g, "")), {
      message: "Please enter a valid 10-digit Indian mobile number",
    })
    .transform((val) => normalizeIndianPhone(val)),
  addressLine1: z
    .string()
    .trim()
    .min(3, "Address line 1 must be at least 3 characters")
    .max(200, "Address line 1 cannot exceed 200 characters"),
  addressLine2: z
    .string()
    .trim()
    .max(200, "Address line 2 cannot exceed 200 characters")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  landmark: z
    .string()
    .trim()
    .max(100, "Landmark cannot exceed 100 characters")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  city: z
    .string()
    .trim()
    .min(2, "City name must be at least 2 characters")
    .max(100, "City name cannot exceed 100 characters"),
  state: z
    .string()
    .trim()
    .refine((val) => isValidIndiaState(val), {
      message: "Please select a valid Indian State or Union Territory",
    })
    .transform((val) => normalizeIndiaState(val) || val),
  postalCode: z
    .string()
    .trim()
    .refine((val) => INDIAN_PINCODE_REGEX.test(val.replace(/\s+/g, "")), {
      message: "Postal code must be a valid 6-digit Indian PIN code (cannot start with 0)",
    })
    .transform((val) => val.replace(/\s+/g, "")),
  country: z
    .string()
    .trim()
    .default("India")
    .transform((val) => (val && val.length > 0 ? val : "India")),
  type: z
    .nativeEnum(AddressType, {
      errorMap: () => ({ message: "Address type must be HOME, WORK, or OTHER" }),
    })
    .default(AddressType.HOME),
  isDefault: z.boolean().optional().default(false),
});

export const UpdateAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .refine((val) => INDIAN_PHONE_REGEX.test(val.replace(/\s+/g, "")), {
      message: "Please enter a valid 10-digit Indian mobile number",
    })
    .transform((val) => normalizeIndianPhone(val))
    .optional(),
  addressLine1: z
    .string()
    .trim()
    .min(3, "Address line 1 must be at least 3 characters")
    .max(200, "Address line 1 cannot exceed 200 characters")
    .optional(),
  addressLine2: z
    .string()
    .trim()
    .max(200, "Address line 2 cannot exceed 200 characters")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  landmark: z
    .string()
    .trim()
    .max(100, "Landmark cannot exceed 100 characters")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  city: z
    .string()
    .trim()
    .min(2, "City name must be at least 2 characters")
    .max(100, "City name cannot exceed 100 characters")
    .optional(),
  state: z
    .string()
    .trim()
    .refine((val) => isValidIndiaState(val), {
      message: "Please select a valid Indian State or Union Territory",
    })
    .transform((val) => normalizeIndiaState(val) || val)
    .optional(),
  postalCode: z
    .string()
    .trim()
    .refine((val) => INDIAN_PINCODE_REGEX.test(val.replace(/\s+/g, "")), {
      message: "Postal code must be a valid 6-digit Indian PIN code (cannot start with 0)",
    })
    .transform((val) => val.replace(/\s+/g, ""))
    .optional(),
  country: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : "India")),
  type: z
    .nativeEnum(AddressType, {
      errorMap: () => ({ message: "Address type must be HOME, WORK, or OTHER" }),
    })
    .optional(),
  isDefault: z.boolean().optional(),
});

export const AddressIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid address identifier format"),
});
