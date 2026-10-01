import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getAdminMe } from "@/app/api/admin/me/route";
import * as sessionModule from "@/lib/auth/session";
import * as rbacModule from "@/lib/auth/rbac";
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
} from "@/lib/auth/rbac";
import { RoleModel } from "@/db/models";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { StaffStatus } from "@/constants/status";
import {
  AuthenticationError,
  AuthorizationError,
  InsufficientPermissionError,
} from "@/lib/errors";
import { IStaff } from "@/types/database";

describe("Admin Authorization & RBAC Integration Suite", () => {
  const mockInventoryStaff: IStaff = {
    _id: "staff_inv_01",
    email: "inv@verona.internal",
    firstName: "Kavita",
    lastName: "Singh",
    status: StaffStatus.ACTIVE,
    roles: ["role_inv_id"],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderStaff: IStaff = {
    _id: "staff_ord_01",
    email: "orders@verona.internal",
    firstName: "Rohan",
    lastName: "Das",
    status: StaffStatus.ACTIVE,
    roles: ["role_ord_id"],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/admin/me", () => {
    it("should return 401 when request is unauthenticated", async () => {
      vi.spyOn(sessionModule, "requireStaff").mockRejectedValue(
        new AuthenticationError("Authentication required to access this resource")
      );

      const response = await getAdminMe();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("should return 403 when customer attempts to access staff endpoint", async () => {
      vi.spyOn(sessionModule, "requireStaff").mockRejectedValue(
        new AuthorizationError("Access denied: Staff privileges required", "STAFF_ONLY")
      );

      const response = await getAdminMe();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("STAFF_ONLY");
    });

    it("should return 200 with staff details and permissions when authorized", async () => {
      vi.spyOn(sessionModule, "requireStaff").mockResolvedValue(mockInventoryStaff);
      vi.spyOn(RoleModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "role_inv_id",
            name: "Inventory Manager",
            slug: ROLES.INVENTORY_MANAGER,
            active: true,
          },
        ]),
      } as any);

      const response = await getAdminMe();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe("inv@verona.internal");
      expect(body.data.permissions).toContain(PERMISSIONS.INVENTORY_READ);
      expect(body.data.permissions).not.toContain(PERMISSIONS.REFUNDS_PROCESS);
    });
  });

  describe("Server-Side Permission Guards", () => {
    beforeEach(() => {
      vi.spyOn(sessionModule, "requireStaff").mockResolvedValue(mockInventoryStaff);
      vi.spyOn(RoleModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "role_inv_id",
            name: "Inventory Manager",
            slug: ROLES.INVENTORY_MANAGER,
            active: true,
          },
        ]),
      } as any);
    });

    it("requirePermission should allow when staff possesses the permission", async () => {
      await expect(
        requirePermission(PERMISSIONS.INVENTORY_READ)
      ).resolves.toBe(mockInventoryStaff);
    });

    it("requirePermission should throw InsufficientPermissionError (403) when permission is missing", async () => {
      await expect(
        requirePermission(PERMISSIONS.REFUNDS_PROCESS)
      ).rejects.toThrow(InsufficientPermissionError);
    });

    it("requireAnyPermission should allow if staff has at least one permission", async () => {
      await expect(
        requireAnyPermission([
          PERMISSIONS.REFUNDS_PROCESS,
          PERMISSIONS.INVENTORY_UPDATE,
        ])
      ).resolves.toBe(mockInventoryStaff);
    });

    it("requireAnyPermission should reject if staff lacks all permissions", async () => {
      await expect(
        requireAnyPermission([
          PERMISSIONS.REFUNDS_PROCESS,
          PERMISSIONS.STAFF_ROLES_MANAGE,
        ])
      ).rejects.toThrow(InsufficientPermissionError);
    });

    it("requireAllPermissions should allow only when all permissions are present", async () => {
      await expect(
        requireAllPermissions([
          PERMISSIONS.INVENTORY_READ,
          PERMISSIONS.PRODUCTS_READ,
        ])
      ).resolves.toBe(mockInventoryStaff);

      await expect(
        requireAllPermissions([
          PERMISSIONS.INVENTORY_READ,
          PERMISSIONS.REFUNDS_PROCESS,
        ])
      ).rejects.toThrow(InsufficientPermissionError);
    });

    it("requireRole should verify staff role correctly", async () => {
      await expect(
        requireRole(ROLES.INVENTORY_MANAGER)
      ).resolves.toBe(mockInventoryStaff);

      await expect(
        requireRole(ROLES.SUPER_ADMIN)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Cross-Role Privilege Boundaries", () => {
    it("Order Manager should be denied inventory adjustment and staff management", async () => {
      vi.spyOn(sessionModule, "requireStaff").mockResolvedValue(mockOrderStaff);
      vi.spyOn(RoleModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "role_ord_id",
            name: "Order Manager",
            slug: ROLES.ORDER_MANAGER,
            active: true,
          },
        ]),
      } as any);

      await expect(
        requirePermission(PERMISSIONS.ORDERS_READ)
      ).resolves.toBe(mockOrderStaff);

      await expect(
        requirePermission(PERMISSIONS.ORDERS_FULFILLMENT)
      ).resolves.toBe(mockOrderStaff);

      // Prohibited cross-role boundaries:
      await expect(
        requirePermission(PERMISSIONS.INVENTORY_UPDATE)
      ).rejects.toThrow(InsufficientPermissionError);

      await expect(
        requirePermission(PERMISSIONS.STAFF_ROLES_MANAGE)
      ).rejects.toThrow(InsufficientPermissionError);

      await expect(
        requirePermission(PERMISSIONS.REFUNDS_PROCESS)
      ).rejects.toThrow(InsufficientPermissionError);
    });
  });
});
