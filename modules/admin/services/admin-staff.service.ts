/**
 * VÉRONA — Admin Staff Administration Service (Phase 29)
 *
 * Provides staff lifecycle administration, role assignment, warehouse scope control,
 * self-escalation prevention, and last Super Admin protection.
 */

import mongoose from "mongoose";
import { StaffModel, RoleModel, WarehouseModel, AuditLogModel } from "@/db/models";
import { StaffStatus } from "@/constants/status";
import { ROLES, Role } from "@/constants/roles";
import { IStaff, IRole, IWarehouse, IAuditLog } from "@/types/database";
import { NotFoundError, BadRequestError, ConflictError, AuthorizationError } from "@/lib/errors";
import { getEffectivePermissions } from "@/lib/auth/rbac";
import { logAuditTrail } from "@/lib/audit";
import {
  AdminStaffListQuery,
  AdminStaffCreateInput,
  AdminStaffUpdateInput,
  AdminStaffStatusUpdateInput,
  AdminStaffRoleUpdateInput,
  AdminStaffScopeUpdateInput,
} from "../validators/admin-staff.validation";
import {
  AdminStaffListItemDTO,
  AdminStaffDetailDTO,
  AdminStaffRoleBriefDTO,
  AdminStaffWarehouseBriefDTO,
} from "../types/admin-management.types";

export class AdminStaffService {
  /**
   * Helper to check if a staff member has the Super Admin role.
   */
  private async isStaffSuperAdmin(staffId: string | mongoose.Types.ObjectId): Promise<boolean> {
    const staff = await StaffModel.findById(staffId).populate("roles").lean<IStaff>();
    if (!staff || !staff.roles) return false;
    return (staff.roles as unknown as IRole[]).some(
      (r) => r.slug === ROLES.SUPER_ADMIN || r.name === "Super Admin"
    );
  }

  /**
   * Helper to count currently active Super Admins.
   */
  private async countActiveSuperAdmins(): Promise<number> {
    const superAdminRole = await RoleModel.findOne({
      $or: [{ slug: ROLES.SUPER_ADMIN }, { name: "Super Admin" }],
      active: true,
    }).lean<IRole>();

    if (!superAdminRole) return 0;

    return StaffModel.countDocuments({
      roles: superAdminRole._id,
      status: StaffStatus.ACTIVE,
      isDeleted: false,
    });
  }

  /**
   * Lists staff members with server-side pagination, search, status, role, and warehouse filtering.
   */
  async listStaff(query: AdminStaffListQuery): Promise<{
    data: AdminStaffListItemDTO[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      isDeleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.warehouseId) {
      filter.assignedWarehouseId = query.warehouseId;
    }

    if (query.role) {
      // Find role by slug or ID
      const roleDoc = await RoleModel.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(query.role) ? [{ _id: new mongoose.Types.ObjectId(query.role) }] : []),
          { slug: query.role.toLowerCase() },
        ],
      }).lean<IRole>();

      if (roleDoc) {
        filter.roles = roleDoc._id;
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const orConditions: Array<Record<string, unknown>> = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
      ];

      if (mongoose.Types.ObjectId.isValid(query.search.trim())) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(query.search.trim()) });
      }

      filter.$or = orConditions;
    }

    const sortField = query.sortBy || "createdAt";
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;

    const [total, rawStaff] = await Promise.all([
      StaffModel.countDocuments(filter),
      StaffModel.find(filter)
        .populate("roles")
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean<IStaff[]>(),
    ]);

    // Batch resolve assigned warehouses
    const warehouseIds = Array.from(
      new Set(rawStaff.map((s) => s.assignedWarehouseId).filter(Boolean) as string[])
    );

    const warehouses = warehouseIds.length > 0
      ? await WarehouseModel.find({
          $or: [
            { code: { $in: warehouseIds } },
            ...(warehouseIds.filter((w) => mongoose.Types.ObjectId.isValid(w)).map((w) => ({ _id: new mongoose.Types.ObjectId(w) }))),
          ],
        }).lean<IWarehouse[]>()
      : [];

    const warehouseMap = new Map<string, AdminStaffWarehouseBriefDTO>();
    for (const w of warehouses) {
      const dto: AdminStaffWarehouseBriefDTO = {
        id: w._id.toString(),
        code: w.code,
        name: w.name,
      };
      warehouseMap.set(w._id.toString(), dto);
      warehouseMap.set(w.code, dto);
    }

    const data: AdminStaffListItemDTO[] = rawStaff.map((s) => {
      const populatedRoles = (s.roles || []) as unknown as IRole[];
      const roleBriefs: AdminStaffRoleBriefDTO[] = populatedRoles.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        slug: r.slug,
      }));

      const warehouse = s.assignedWarehouseId ? warehouseMap.get(s.assignedWarehouseId) || null : null;

      return {
        id: s._id.toString(),
        authProviderId: s.authProviderId || null,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone || null,
        status: s.status,
        roles: roleBriefs,
        assignedWarehouseId: s.assignedWarehouseId || null,
        warehouse,
        lastLoginAt: s.lastLoginAt ? new Date(s.lastLoginAt) : null,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves comprehensive details for a staff member including effective permissions and audit activity.
   */
  async getStaffDetail(id: string): Promise<AdminStaffDetailDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID format");
    }

    const staff = await StaffModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    })
      .populate("roles")
      .lean<IStaff>();

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${id}' not found`);
    }

    const populatedRoles = (staff.roles || []) as unknown as IRole[];
    const roleBriefs: AdminStaffRoleBriefDTO[] = populatedRoles.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      slug: r.slug,
    }));

    let warehouse: AdminStaffWarehouseBriefDTO | null = null;
    if (staff.assignedWarehouseId) {
      const w = await WarehouseModel.findOne({
        $or: [
          { code: staff.assignedWarehouseId },
          ...(mongoose.Types.ObjectId.isValid(staff.assignedWarehouseId)
            ? [{ _id: new mongoose.Types.ObjectId(staff.assignedWarehouseId) }]
            : []),
        ],
      }).lean<IWarehouse>();

      if (w) {
        warehouse = {
          id: w._id.toString(),
          code: w.code,
          name: w.name,
        };
      }
    }

    // Resolve effective permissions
    const effectivePermissions = await getEffectivePermissions(staff);

    // Fetch recent administrative activity logged by this staff member
    const recentAudit = await AuditLogModel.find({
      actorId: staff._id.toString(),
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean<IAuditLog[]>();

    const activity = recentAudit.map((a) => ({
      id: a._id.toString(),
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      timestamp: new Date(a.createdAt),
      metadata: (a.metadata as Record<string, unknown>) || undefined,
    }));

    return {
      id: staff._id.toString(),
      authProviderId: staff.authProviderId || null,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone || null,
      status: staff.status,
      roles: roleBriefs,
      assignedWarehouseId: staff.assignedWarehouseId || null,
      warehouse,
      effectivePermissions,
      activity,
      lastLoginAt: staff.lastLoginAt ? new Date(staff.lastLoginAt) : null,
      createdAt: new Date(staff.createdAt),
      updatedAt: new Date(staff.updatedAt),
    };
  }

  /**
   * Onboards / creates a new staff account with assigned roles and warehouse scope.
   */
  async createOrInviteStaff(
    input: AdminStaffCreateInput,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminStaffListItemDTO> {
    const existing = await StaffModel.findOne({
      email: input.email.toLowerCase(),
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(`Staff member with email '${input.email}' already exists`);
    }

    // Validate and resolve roles
    const roleDocs = await RoleModel.find({
      $or: [
        { _id: { $in: input.roles.filter((r) => mongoose.Types.ObjectId.isValid(r)).map((r) => new mongoose.Types.ObjectId(r)) } },
        { slug: { $in: input.roles.map((r) => r.toLowerCase()) } },
      ],
      active: true,
    }).lean<IRole[]>();

    if (roleDocs.length === 0) {
      throw new BadRequestError("At least one valid active role must be assigned");
    }

    // Self-Escalation / Privilege Guard: Only Super Admin can assign Super Admin role
    const assignsSuperAdmin = roleDocs.some(
      (r) => r.slug === ROLES.SUPER_ADMIN || r.name === "Super Admin"
    );
    if (assignsSuperAdmin) {
      const actorIsSuperAdmin = await this.isStaffSuperAdmin(actorStaff._id);
      if (!actorIsSuperAdmin) {
        throw new AuthorizationError(
          "Access denied: Only active Super Admins can assign the Super Admin role",
          "PRIVILEGE_ESCALATION_BLOCKED"
        );
      }
    }

    // Validate warehouse scope if provided
    let warehouseScope = input.assignedWarehouseId?.trim() || null;
    if (warehouseScope) {
      const warehouseExists = await WarehouseModel.findOne({
        $or: [
          { code: warehouseScope },
          ...(mongoose.Types.ObjectId.isValid(warehouseScope)
            ? [{ _id: new mongoose.Types.ObjectId(warehouseScope) }]
            : []),
        ],
      });
      if (!warehouseExists) {
        throw new BadRequestError(`Warehouse '${warehouseScope}' not found`);
      }
    }

    const newStaff = await StaffModel.create({
      email: input.email.toLowerCase().trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      status: StaffStatus.ACTIVE,
      roles: roleDocs.map((r) => r._id),
      assignedWarehouseId: warehouseScope,
    });

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "staff.created",
      entityType: "Staff",
      entityId: newStaff._id.toString(),
      after: {
        email: newStaff.email,
        roles: roleDocs.map((r) => r.slug),
        assignedWarehouseId: warehouseScope,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return {
      id: newStaff._id.toString(),
      authProviderId: null,
      email: newStaff.email,
      firstName: newStaff.firstName,
      lastName: newStaff.lastName,
      phone: newStaff.phone || null,
      status: newStaff.status,
      roles: roleDocs.map((r) => ({ id: r._id.toString(), name: r.name, slug: r.slug })),
      assignedWarehouseId: newStaff.assignedWarehouseId || null,
      lastLoginAt: null,
      createdAt: new Date(newStaff.createdAt),
      updatedAt: new Date(newStaff.updatedAt),
    };
  }

  /**
   * Updates basic profile attributes for a staff member.
   */
  async updateStaff(
    id: string,
    input: AdminStaffUpdateInput,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminStaffListItemDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID format");
    }

    const staff = await StaffModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    });

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${id}' not found`);
    }

    const beforeState = {
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone,
    };

    if (input.firstName !== undefined) staff.firstName = input.firstName.trim();
    if (input.lastName !== undefined) staff.lastName = input.lastName.trim();
    if (input.phone !== undefined) staff.phone = input.phone ? input.phone.trim() : null;

    await staff.save();

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "staff.updated",
      entityType: "Staff",
      entityId: id,
      before: beforeState,
      after: {
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return this.getStaffDetail(id);
  }

  /**
   * Updates staff status (ACTIVE / SUSPENDED) with Last Super Admin protection.
   */
  async updateStaffStatus(
    id: string,
    input: AdminStaffStatusUpdateInput,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminStaffListItemDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID format");
    }

    const staff = await StaffModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    });

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${id}' not found`);
    }

    if (staff.status === input.status) {
      return this.getStaffDetail(id);
    }

    // Last Super Admin Protection
    if (input.status === StaffStatus.SUSPENDED) {
      const isTargetSuperAdmin = await this.isStaffSuperAdmin(staff._id);
      if (isTargetSuperAdmin) {
        const activeCount = await this.countActiveSuperAdmins();
        if (activeCount <= 1) {
          throw new ConflictError("Cannot suspend the final active Super Admin of the platform");
        }
      }
    }

    const previousStatus = staff.status;
    staff.status = input.status;
    await staff.save();

    const action = input.status === StaffStatus.SUSPENDED ? "staff.suspended" : "staff.restored";

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action,
      entityType: "Staff",
      entityId: id,
      before: { status: previousStatus },
      after: { status: input.status },
      metadata: { reason: input.reason || null },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return this.getStaffDetail(id);
  }

  /**
   * Mutates staff roles with Self-Escalation Prevention and Last Super Admin Protection.
   */
  async updateStaffRoles(
    id: string,
    input: AdminStaffRoleUpdateInput,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminStaffListItemDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID format");
    }

    // Self-Escalation Guard: A staff member cannot modify their own roles
    if (actorStaff._id.toString() === id) {
      throw new AuthorizationError(
        "Staff members are strictly prohibited from altering their own assigned roles",
        "SELF_ESCALATION_BLOCKED"
      );
    }

    const staff = await StaffModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    }).populate("roles");

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${id}' not found`);
    }

    // Resolve target roles
    const targetRoles = await RoleModel.find({
      $or: [
        { _id: { $in: input.roles.filter((r) => mongoose.Types.ObjectId.isValid(r)).map((r) => new mongoose.Types.ObjectId(r)) } },
        { slug: { $in: input.roles.map((r) => r.toLowerCase()) } },
      ],
      active: true,
    }).lean<IRole[]>();

    if (targetRoles.length === 0) {
      throw new BadRequestError("At least one valid active role must be assigned");
    }

    const targetHasSuperAdmin = targetRoles.some(
      (r) => r.slug === ROLES.SUPER_ADMIN || r.name === "Super Admin"
    );

    const actorIsSuperAdmin = await this.isStaffSuperAdmin(actorStaff._id);

    // Only Super Admin can grant Super Admin role
    if (targetHasSuperAdmin && !actorIsSuperAdmin) {
      throw new AuthorizationError(
        "Access denied: Only active Super Admins can assign the Super Admin role",
        "PRIVILEGE_ESCALATION_BLOCKED"
      );
    }

    // Last Super Admin Protection: Cannot strip Super Admin from the last active one
    const previousRoles = (staff.roles || []) as unknown as IRole[];
    const wasSuperAdmin = previousRoles.some(
      (r) => r.slug === ROLES.SUPER_ADMIN || r.name === "Super Admin"
    );

    if (wasSuperAdmin && !targetHasSuperAdmin && staff.status === StaffStatus.ACTIVE) {
      const activeSuperAdmins = await this.countActiveSuperAdmins();
      if (activeSuperAdmins <= 1) {
        throw new ConflictError("Cannot remove the Super Admin role from the final active Super Admin");
      }
    }

    staff.roles = targetRoles.map((r) => r._id);
    await staff.save();

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "staff.role_changed",
      entityType: "Staff",
      entityId: id,
      before: { roles: previousRoles.map((r) => r.slug) },
      after: { roles: targetRoles.map((r) => r.slug) },
      metadata: { reason: input.reason || null },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return this.getStaffDetail(id);
  }

  /**
   * Assigns or clears warehouse scope for staff member.
   */
  async updateStaffScope(
    id: string,
    input: AdminStaffScopeUpdateInput,
    actorStaff: IStaff,
    reqMeta?: { ip?: string; ua?: string }
  ): Promise<AdminStaffListItemDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID format");
    }

    const staff = await StaffModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    });

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${id}' not found`);
    }

    let warehouseScope = input.assignedWarehouseId?.trim() || null;
    if (warehouseScope) {
      const warehouseExists = await WarehouseModel.findOne({
        $or: [
          { code: warehouseScope },
          ...(mongoose.Types.ObjectId.isValid(warehouseScope)
            ? [{ _id: new mongoose.Types.ObjectId(warehouseScope) }]
            : []),
        ],
      });
      if (!warehouseExists) {
        throw new BadRequestError(`Warehouse '${warehouseScope}' not found`);
      }
    }

    const previousScope = staff.assignedWarehouseId;
    staff.assignedWarehouseId = warehouseScope;
    await staff.save();

    await logAuditTrail({
      actorId: actorStaff._id.toString(),
      actorEmail: actorStaff.email,
      action: "staff.scope_changed",
      entityType: "Staff",
      entityId: id,
      before: { assignedWarehouseId: previousScope },
      after: { assignedWarehouseId: warehouseScope },
      metadata: { reason: input.reason || null },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.ua,
    });

    return this.getStaffDetail(id);
  }
}

export const adminStaffService = new AdminStaffService();
