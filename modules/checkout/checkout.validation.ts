/**
 * VÉRONA — Checkout Validation Schemas
 */

import { z } from "zod";

export const SelectAddressSchema = z.object({
  addressId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid address identifier format"),
});

export const SelectCheckoutAddressSchema = SelectAddressSchema;

export const CheckoutSessionIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid checkout session identifier format"),
});

export const CheckoutSessionParamsSchema = CheckoutSessionIdParamSchema;
