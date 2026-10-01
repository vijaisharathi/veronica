/**
 * VÉRONA — Admin Audit Log Validation Schemas (Phase 29)
 */

import { z } from "zod";
import { AuditActorType } from "@/constants/status";

export const AdminAuditListQuerySchema = z.object({
  search: z.string().trim().optional(),
  actorId: z.string().trim().optional(),
  actorType: z.nativeEnum(AuditActorType).optional(),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  endDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().trim().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminAuditListQuery = z.infer<typeof AdminAuditListQuerySchema>;

export const AdminAuditExportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).default("json"),
  entityType: z.string().trim().optional(),
  action: z.string().trim().optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
  endDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().datetime().nullable().optional()),
});

export type AdminAuditExportQuery = z.infer<typeof AdminAuditExportQuerySchema>;
