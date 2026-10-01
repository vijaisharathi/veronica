/**
 * VÉRONA — Admin Staff Validation Schemas (Phase 29)
 */

import { z } from "zod";
import { StaffStatus } from "@/constants/status";

export const AdminStaffListQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  status: z.nativeEnum(StaffStatus).optional(),
  warehouseId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminStaffListQuery = z.infer<typeof AdminStaffListQuerySchema>;

export const AdminStaffCreateSchema = z.object({
  email: z.string().trim().email("Valid email required"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  roles: z.array(z.string().trim().min(1)).min(1, "At least one role must be assigned"),
  assignedWarehouseId: z.string().trim().nullable().optional().or(z.literal("")),
});

export type AdminStaffCreateInput = z.infer<typeof AdminStaffCreateSchema>;

export const AdminStaffUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional().or(z.literal("")),
  roles: z.array(z.string().trim().min(1)).min(1).optional(),
  assignedWarehouseId: z.string().trim().nullable().optional().or(z.literal("")),
});

export type AdminStaffUpdateInput = z.infer<typeof AdminStaffUpdateSchema>;

export const AdminStaffStatusUpdateSchema = z.object({
  status: z.enum([StaffStatus.ACTIVE, StaffStatus.SUSPENDED], {
    errorMap: () => ({ message: "Status must be either ACTIVE or SUSPENDED" }),
  }),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500).optional(),
});

export type AdminStaffStatusUpdateInput = z.infer<typeof AdminStaffStatusUpdateSchema>;

export const AdminStaffRoleUpdateSchema = z.object({
  roles: z.array(z.string().trim().min(1)).min(1, "At least one role must be assigned"),
  reason: z.string().trim().max(500).optional(),
});

export type AdminStaffRoleUpdateInput = z.infer<typeof AdminStaffRoleUpdateSchema>;

export const AdminStaffScopeUpdateSchema = z.object({
  assignedWarehouseId: z.string().trim().nullable().optional().or(z.literal("")),
  reason: z.string().trim().max(500).optional(),
});

export type AdminStaffScopeUpdateInput = z.infer<typeof AdminStaffScopeUpdateSchema>;
