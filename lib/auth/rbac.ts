/**
 * VÉRONA — Role-Based Access Control (RBAC) & Permission Resolver
 *
 * Deterministic resolution of staff roles and granular permissions.
 * Provides strict server-side guards preventing unauthorized access.
 */

import { RoleModel } from "@/db/models";
import { IStaff, IRole } from "@/types/database";
import { Permission, ALL_PERMISSIONS } from "@/constants/permissions";
import { ROLES, Role, ROLE_PERMISSIONS_MAP } from "@/constants/roles";
import { InsufficientPermissionError, AuthorizationError } from "@/lib/errors";
import { requireStaff } from "./session";

/**
 * Resolves the complete, deduplicated set of effective permissions for a staff member.
 */
export async function getEffectivePermissions(staff: IStaff): Promise<Permission[]> {
  if (!staff.roles || staff.roles.length === 0) {
    return [];
  }

  // Load populated or queried role records
  const roles = await RoleModel.find({
    _id: { $in: staff.roles },
    active: true,
  }).lean<IRole[]>();

  const permissionSet = new Set<Permission>();

  for (const role of roles) {
    // Super admin automatically receives all registered platform permissions
    if (role.slug === ROLES.SUPER_ADMIN || role.name === "Super Admin") {
      return [...ALL_PERMISSIONS];
    }

    // Role permissions from database
    if (role.permissions && Array.isArray(role.permissions)) {
      for (const p of role.permissions) {
        permissionSet.add(p as Permission);
      }
    }

    // Fallback/standard role mapping if defined in codebase
    const standardPerms = ROLE_PERMISSIONS_MAP[role.slug as Role];
    if (standardPerms) {
      for (const p of standardPerms) {
        permissionSet.add(p);
      }
    }
  }

  return Array.from(permissionSet);
}

/**
 * Pure helper to verify if a permission exists in a permission set.
 */
export function hasPermission(granted: readonly Permission[] | Permission[], required: Permission): boolean {
  return granted.includes(required);
}

/**
 * Pure helper to verify if any of the required permissions exist in granted permissions.
 */
export function hasAnyPermission(granted: readonly Permission[] | Permission[], required: Permission[]): boolean {
  return required.some((p) => granted.includes(p));
}

/**
 * Pure helper to verify if all required permissions exist in granted permissions.
 */
export function hasAllPermissions(granted: readonly Permission[] | Permission[], required: Permission[]): boolean {
  return required.every((p) => granted.includes(p));
}

/**
 * Server guard: Requires the current caller to be an active staff member with a specific permission.
 */
export async function requirePermission(permission: Permission): Promise<IStaff> {
  const staff = await requireStaff();
  const effectivePermissions = await getEffectivePermissions(staff);

  if (!hasPermission(effectivePermissions, permission)) {
    throw new InsufficientPermissionError(
      permission,
      `Access denied: Missing required permission '${permission}'`
    );
  }

  return staff;
}

/**
 * Server guard: Requires the current caller to possess at least ONE of the specified permissions.
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<IStaff> {
  const staff = await requireStaff();
  const effectivePermissions = await getEffectivePermissions(staff);

  if (!hasAnyPermission(effectivePermissions, permissions)) {
    throw new InsufficientPermissionError(
      permissions.join(", "),
      `Access denied: Requires at least one of [${permissions.join(", ")}]`
    );
  }

  return staff;
}

/**
 * Server guard: Requires the current caller to possess ALL specified permissions.
 */
export async function requireAllPermissions(permissions: Permission[]): Promise<IStaff> {
  const staff = await requireStaff();
  const effectivePermissions = await getEffectivePermissions(staff);

  if (!hasAllPermissions(effectivePermissions, permissions)) {
    throw new InsufficientPermissionError(
      permissions.join(", "),
      `Access denied: Requires all of [${permissions.join(", ")}]`
    );
  }

  return staff;
}

/**
 * Server guard: Requires the current staff member to possess a specific role.
 */
export async function requireRole(requiredRole: Role): Promise<IStaff> {
  const staff = await requireStaff();
  const roles = await RoleModel.find({
    _id: { $in: staff.roles },
    active: true,
  }).lean<IRole[]>();

  const hasRole = roles.some((r) => r.slug === requiredRole || (requiredRole === ROLES.SUPER_ADMIN && r.name === "Super Admin"));

  if (!hasRole) {
    throw new AuthorizationError(
      `Access denied: Role '${requiredRole}' required`,
      "ROLE_REQUIRED"
    );
  }

  return staff;
}
