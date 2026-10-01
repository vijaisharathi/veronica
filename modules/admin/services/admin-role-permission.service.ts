/**
 * VÉRONA — Admin Role & Permission Administration Service (Phase 29)
 *
 * Provides access to the centralized RBAC catalog, role inspection, and
 * safe permission management strictly bounded by Phase 5 architecture.
 */

import mongoose from "mongoose";
import { RoleModel, PermissionModel, StaffModel } from "@/db/models";
import { ALL_PERMISSIONS, Permission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { StaffStatus } from "@/constants/status";
import { IRole, IPermission, IStaff } from "@/types/database";
import { NotFoundError, BadRequestError, ForbiddenError } from "@/lib/errors";
import { logAuditTrail } from "@/lib/audit";
import { AdminRoleDTO, AdminPermissionDTO } from "../types/admin-management.types";

export class AdminRolePermissionService {
  /**
   * Lists all roles with assigned active staff count.
   */
  async listRoles(): Promise<AdminRoleDTO[]> {
    const roles = await RoleModel.find().sort({ isSystem: -1, name: 1 }).lean<IRole[]>();

    // Aggregate staff count per role
    const staffAggregates = await StaffModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      count: number;
    }>([
      { $match: { isDeleted: false, status: StaffStatus.ACTIVE } },
      { $unwind: "$roles" },
      { $group: { _id: "$roles", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const agg of staffAggregates) {
      countMap.set(agg._id.toString(), agg.count);
    }

    return roles.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      slug: r.slug,
      description: r.description,
      permissions: (r.permissions || []).map(String),
      isSystem: Boolean(r.isSystem),
      active: Boolean(r.active),
      staffCount: countMap.get(r._id.toString()) || 0,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }));
  }

  /**
   * Retrieves single role details by ID or slug.
   */
  async getRole(idOrSlug: string): Promise<AdminRoleDTO> {
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: new mongoose.Types.ObjectId(idOrSlug) }
      : { slug: idOrSlug.toLowerCase() };

    const role = await RoleModel.findOne(query).lean<IRole>();
    if (!role) {
      throw new NotFoundError(`Role '${idOrSlug}' not found`);
    }

    const staffCount = await StaffModel.countDocuments({
      roles: role._id,
      status: StaffStatus.ACTIVE,
      isDeleted: false,
    });

    return {
      id: role._id.toString(),
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: (role.permissions || []).map(String),
      isSystem: Boolean(role.isSystem),
      active: Boolean(role.active),
      staffCount,
      createdAt: new Date(role.createdAt),
      updatedAt: new Date(role.updatedAt),
    };
  }

  /**
   * Lists all available system permissions categorized by module.
   */
  async listPermissions(): Promise<AdminPermissionDTO[]> {
    // Check if permission models are populated in DB
    const dbPermissions = await PermissionModel.find().sort({ module: 1, code: 1 }).lean<IPermission[]>();

    if (dbPermissions.length > 0) {
      return dbPermissions.map((p) => ({
        code: p.code,
        name: p.name,
        module: p.module,
        description: p.description,
      }));
    }

    // Fallback: derive catalog from code-defined ALL_PERMISSIONS constants
    return ALL_PERMISSIONS.map((code) => {
      const parts = code.split(".");
      const module = (parts[0] || "SYSTEM").toUpperCase();
      const action = parts.slice(1).join(" ").replace(/_/g, " ");
      const name = `${module} — ${action.charAt(0).toUpperCase() + action.slice(1)}`;
      return {
        code,
        name,
        module,
        description: `Allows administrative ${action} in ${module} module`,
      };
    });
  }

  /**
   * Updates assigned permissions for a role with strict safety validations.
   */
  async updateRolePermissions(
    roleId: string,
    permissions: string[],
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminRoleDTO> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new BadRequestError("Invalid role ID format");
    }

    const role = await RoleModel.findById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with ID '${roleId}' not found`);
    }

    // Protection: Cannot restrict Super Admin role (it inherently possesses all permissions)
    if (role.slug === ROLES.SUPER_ADMIN || role.name === "Super Admin") {
      throw new ForbiddenError("The Super Admin role inherently holds all platform permissions and cannot be restricted");
    }

    // Validate that all permissions exist in the registered catalog
    const validPermissionSet = new Set<string>(ALL_PERMISSIONS);
    for (const p of permissions) {
      if (!validPermissionSet.has(p)) {
        throw new BadRequestError(`Invalid permission code '${p}'. Arbitrary permission strings are prohibited.`);
      }
    }

    const previousPermissions = [...(role.permissions || [])];
    role.permissions = permissions;
    await role.save();

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "role.permissions_changed",
      entityType: "Role",
      entityId: role._id.toString(),
      before: { permissions: previousPermissions },
      after: { permissions },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    const staffCount = await StaffModel.countDocuments({
      roles: role._id,
      status: StaffStatus.ACTIVE,
      isDeleted: false,
    });

    return {
      id: role._id.toString(),
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.permissions,
      isSystem: Boolean(role.isSystem),
      active: Boolean(role.active),
      staffCount,
      createdAt: new Date(role.createdAt),
      updatedAt: new Date(role.updatedAt),
    };
  }
}

export const adminRolePermissionService = new AdminRolePermissionService();
