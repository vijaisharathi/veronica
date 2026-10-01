/**
 * VÉRONA — Admin Customer Validation Schemas (Phase 29)
 */

import { z } from "zod";
import { CustomerStatus } from "@/constants/status";

export const AdminCustomerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  emailVerified: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  startDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  endDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminCustomerListQuery = z.infer<typeof AdminCustomerListQuerySchema>;

export const AdminCustomerStatusUpdateSchema = z.object({
  status: z.enum([CustomerStatus.ACTIVE, CustomerStatus.SUSPENDED], {
    errorMap: () => ({ message: "Status must be either ACTIVE or SUSPENDED" }),
  }),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500).optional(),
});

export type AdminCustomerStatusUpdateInput = z.infer<typeof AdminCustomerStatusUpdateSchema>;

export const AdminCustomerExportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).default("json"),
  status: z.nativeEnum(CustomerStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AdminCustomerExportQuery = z.infer<typeof AdminCustomerExportQuerySchema>;
