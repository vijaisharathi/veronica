import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminRolesManager } from "@/components/admin/roles/admin-roles-manager";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  await requireAnyPermission([
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.STAFF_ROLES_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-normal text-foreground">
          RBAC Roles & Permissions
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          VÉRONA Access Governance • Granular Permission Catalog • Role Authorization Matrices
        </p>
      </div>

      <AdminRolesManager />
    </div>
  );
}
