"use client";

import * as React from "react";
import { Permission } from "@/constants/permissions";

interface PermissionContextValue {
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
}

const PermissionContext = React.createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  children,
  userPermissions = [],
}: {
  children: React.ReactNode;
  userPermissions: Permission[];
}) {
  const value = React.useMemo<PermissionContextValue>(() => {
    const permSet = new Set(userPermissions);
    return {
      permissions: userPermissions,
      hasPermission: (permission: Permission) => permSet.has(permission),
      hasAnyPermission: (permissions: Permission[]) => permissions.some((p) => permSet.has(p)),
    };
  }, [userPermissions]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = React.useContext(PermissionContext);
  if (!context) {
    return {
      permissions: [] as Permission[],
      hasPermission: () => false,
      hasAnyPermission: () => false,
    };
  }
  return context;
}

export interface PermissionGateProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * UI-only permission gate for conditional rendering.
 * IMPORTANT: This is for UX only. Server-side authorization remains mandatory on all mutations.
 */
export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = usePermissions();

  let isAllowed = false;

  if (Array.isArray(permission)) {
    if (requireAll) {
      isAllowed = permission.every((p) => hasPermission(p));
    } else {
      isAllowed = hasAnyPermission(permission);
    }
  } else {
    isAllowed = hasPermission(permission);
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
