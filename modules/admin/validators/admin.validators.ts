/**
 * VÉRONA — Admin Query & Action Validators (Phase 27)
 */

import { z } from "zod";

export const DashboardRangeSchema = z.enum(["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS"]).default("TODAY");

export const AdminSearchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(100),
});

export const ListPaymentsQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
