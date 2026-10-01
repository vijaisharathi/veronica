/**
 * VÉRONA — Admin Security, Privilege Escalation & Invariants Unit Tests (Phase 29)
 *
 * Verifies self-escalation prevention, last Super Admin demotion/suspension protection,
 * and RBAC boundary enforcement.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { adminStaffService } from "@/modules/admin/services/admin-staff.service";
import { StaffModel, RoleModel } from "@/db/models";
import { StaffStatus } from "@/constants/status";
import { ROLES } from "@/constants/roles";
import { AuthorizationError, ConflictError } from "@/lib/errors";

vi.mock("@/db/models", () => ({
  StaffModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
  RoleModel: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
  WarehouseModel: {
    findOne: vi.fn(),
  },
  AuditLogModel: {
    find: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditTrail: vi.fn().mockResolvedValue(undefined),
}));

describe("Phase 29 — Privilege Escalation & Last Super Admin Protections", () => {
  const superAdminRoleId = new mongoose.Types.ObjectId();
  const orderManagerRoleId = new mongoose.Types.ObjectId();

  const superAdminStaff = {
    _id: new mongoose.Types.ObjectId(),
    email: "owner@verona.com",
    roles: [{ _id: superAdminRoleId, slug: ROLES.SUPER_ADMIN, name: "Super Admin" }],
    status: StaffStatus.ACTIVE,
  };

  const normalStaff = {
    _id: new mongoose.Types.ObjectId(),
    email: "manager@verona.com",
    roles: [{ _id: orderManagerRoleId, slug: ROLES.ORDER_MANAGER, name: "Order Manager" }],
    status: StaffStatus.ACTIVE,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks staff member from altering their own assigned roles (Self-Escalation Guard)", async () => {
    const actorStaff = { ...normalStaff } as any;

    await expect(
      adminStaffService.updateStaffRoles(
        actorStaff._id.toString(), // Same ID as caller
        { roles: [ROLES.SUPER_ADMIN] },
        actorStaff
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("blocks non-super admin from assigning Super Admin role to another staff member", async () => {
    const actorStaff = { ...normalStaff } as any;
    const targetStaffId = new mongoose.Types.ObjectId().toString();

    // Mock target staff found
    (StaffModel.findOne as any).mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(targetStaffId),
        roles: [],
      }),
    });

    // Mock role lookup returning Super Admin role
    (RoleModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { _id: superAdminRoleId, slug: ROLES.SUPER_ADMIN, name: "Super Admin" },
      ]),
    });

    // Mock actor check: actor is NOT super admin
    (StaffModel.findById as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: actorStaff._id,
          roles: [{ slug: ROLES.ORDER_MANAGER, name: "Order Manager" }],
        }),
      }),
    });

    await expect(
      adminStaffService.updateStaffRoles(
        targetStaffId,
        { roles: [ROLES.SUPER_ADMIN] },
        actorStaff
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("prevents suspending the final active Super Admin", async () => {
    const superAdminActor = { ...superAdminStaff } as any;
    const targetSuperAdminId = new mongoose.Types.ObjectId().toString();

    const targetDoc = {
      _id: new mongoose.Types.ObjectId(targetSuperAdminId),
      status: StaffStatus.ACTIVE,
      save: vi.fn(),
    };

    (StaffModel.findOne as any).mockResolvedValue(targetDoc);

    // Target is a super admin
    (StaffModel.findById as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: targetDoc._id,
          roles: [{ slug: ROLES.SUPER_ADMIN, name: "Super Admin" }],
        }),
      }),
    });

    // Super admin role lookup
    (RoleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: superAdminRoleId }),
    });

    // Exactly 1 active super admin remaining
    (StaffModel.countDocuments as any).mockResolvedValue(1);

    await expect(
      adminStaffService.updateStaffStatus(
        targetSuperAdminId,
        { status: StaffStatus.SUSPENDED, reason: "Deactivation test" },
        superAdminActor
      )
    ).rejects.toThrow(ConflictError);
  });

  it("prevents demoting the final active Super Admin", async () => {
    const superAdminActor = { ...superAdminStaff } as any;
    const targetSuperAdminId = new mongoose.Types.ObjectId().toString();

    const targetDoc = {
      _id: new mongoose.Types.ObjectId(targetSuperAdminId),
      roles: [{ _id: superAdminRoleId, slug: ROLES.SUPER_ADMIN, name: "Super Admin" }],
      status: StaffStatus.ACTIVE,
      save: vi.fn(),
    };

    (StaffModel.findOne as any).mockReturnValue({
      populate: vi.fn().mockResolvedValue(targetDoc),
    });

    // New roles target Order Manager only
    (RoleModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { _id: orderManagerRoleId, slug: ROLES.ORDER_MANAGER, name: "Order Manager" },
      ]),
    });

    // Actor is super admin
    (StaffModel.findById as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(superAdminActor),
      }),
    });

    // Super admin role lookup
    (RoleModel.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: superAdminRoleId }),
    });

    // Exactly 1 active super admin in system
    (StaffModel.countDocuments as any).mockResolvedValue(1);

    await expect(
      adminStaffService.updateStaffRoles(
        targetSuperAdminId,
        { roles: [ROLES.ORDER_MANAGER] },
        superAdminActor
      )
    ).rejects.toThrow(ConflictError);
  });
});
