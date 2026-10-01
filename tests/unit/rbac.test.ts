import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/auth/rbac";
import { RoleModel } from "@/db/models";
import { PERMISSIONS, ALL_PERMISSIONS, Permission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { StaffStatus } from "@/constants/status";
import { IStaff } from "@/types/database";

describe("Role-Based Access Control (RBAC) & Permission Resolver Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Pure Permission Helpers", () => {
    const granted: Permission[] = [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.INVENTORY_READ,
    ];

    it("hasPermission should return true when permission is present", () => {
      expect(hasPermission(granted, PERMISSIONS.PRODUCTS_READ)).toBe(true);
      expect(hasPermission(granted, PERMISSIONS.INVENTORY_READ)).toBe(true);
    });

    it("hasPermission should return false when permission is absent", () => {
      expect(hasPermission(granted, PERMISSIONS.REFUNDS_PROCESS)).toBe(false);
      expect(hasPermission(granted, PERMISSIONS.STAFF_ROLES_MANAGE)).toBe(false);
    });

    it("hasAnyPermission should return true if at least one matches", () => {
      expect(
        hasAnyPermission(granted, [PERMISSIONS.REFUNDS_PROCESS, PERMISSIONS.PRODUCTS_READ])
      ).toBe(true);
    });

    it("hasAnyPermission should return false if none match", () => {
      expect(
        hasAnyPermission(granted, [PERMISSIONS.REFUNDS_PROCESS, PERMISSIONS.STAFF_DELETE])
      ).toBe(false);
    });

    it("hasAllPermissions should require every single permission", () => {
      expect(
        hasAllPermissions(granted, [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.PRODUCTS_UPDATE])
      ).toBe(true);
      expect(
        hasAllPermissions(granted, [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.REFUNDS_PROCESS])
      ).toBe(false);
    });
  });

  describe("Effective Permission Resolution by Role", () => {
    it("should grant ALL_PERMISSIONS to SUPER_ADMIN", async () => {
      const superAdminStaff: IStaff = {
        _id: "staff_super",
        email: "superadmin@verona.internal",
        firstName: "Super",
        lastName: "Admin",
        status: StaffStatus.ACTIVE,
        roles: ["role_super_admin"],
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(RoleModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "role_super_admin",
            name: "Super Admin",
            slug: ROLES.SUPER_ADMIN,
            isSystem: true,
            active: true,
          },
        ]),
      } as any);

      const permissions = await getEffectivePermissions(superAdminStaff);

      expect(permissions.length).toBe(ALL_PERMISSIONS.length);
      expect(permissions).toContain(PERMISSIONS.REFUNDS_PROCESS);
      expect(permissions).toContain(PERMISSIONS.STAFF_ROLES_MANAGE);
      expect(permissions).toContain(PERMISSIONS.PRODUCTS_DELETE);
    });

    it("should grant inventory permissions and deny refund processing to INVENTORY_MANAGER", async () => {
      const inventoryStaff: IStaff = {
        _id: "staff_inv",
        email: "inventory@verona.internal",
        firstName: "Rajesh",
        lastName: "Kumar",
        status: StaffStatus.ACTIVE,
        roles: ["role_inv_mgr"],
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(RoleModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "role_inv_mgr",
            name: "Inventory Manager",
            slug: ROLES.INVENTORY_MANAGER,
            isSystem: false,
            active: true,
          },
        ]),
      } as any);

      const permissions = await getEffectivePermissions(inventoryStaff);

      expect(permissions).toContain(PERMISSIONS.INVENTORY_READ);
      expect(permissions).toContain(PERMISSIONS.INVENTORY_UPDATE);
      expect(permissions).toContain(PERMISSIONS.PRODUCTS_READ);

      // Least-privilege protections:
      expect(permissions).not.toContain(PERMISSIONS.REFUNDS_PROCESS);
      expect(permissions).not.toContain(PERMISSIONS.STAFF_ROLES_MANAGE);
    });

    it("should grant customer service permissions and deny inventory adjustment to SUPPORT_AGENT", async () => {
      const supportStaff: IStaff = {
        _id: "staff_supp",
        email: "support@verona.internal",
        firstName: "Priya",
        lastName: "Menon",
        status: StaffStatus.ACTIVE,
        roles: ["role_supp"],
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(RoleModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "role_supp",
            name: "Support Agent",
            slug: ROLES.SUPPORT_AGENT,
            isSystem: false,
            active: true,
          },
        ]),
      } as any);

      const permissions = await getEffectivePermissions(supportStaff);

      expect(permissions).toContain(PERMISSIONS.SUPPORT_READ);
      expect(permissions).toContain(PERMISSIONS.SUPPORT_UPDATE);
      expect(permissions).toContain(PERMISSIONS.CUSTOMERS_READ_LIMITED);

      // Denials:
      expect(permissions).not.toContain(PERMISSIONS.INVENTORY_UPDATE);
      expect(permissions).not.toContain(PERMISSIONS.REFUNDS_PROCESS);
      expect(permissions).not.toContain(PERMISSIONS.STAFF_CREATE);
    });
  });
});
