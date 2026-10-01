import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminStaffManager } from "@/components/admin/staff/admin-staff-manager";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  await requireAnyPermission([
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-normal text-foreground">
          Staff Administration & Roles
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          VÉRONA Workforce Management • RBAC Role Assignments • Operational Warehouse Scoping
        </p>
      </div>

      <AdminStaffManager />
    </div>
  );
}
