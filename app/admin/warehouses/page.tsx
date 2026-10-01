import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminWarehousesManager } from "@/components/admin/admin-warehouses-manager";

export const dynamic = "force-dynamic";

export default async function AdminWarehousesPage() {
  // Server-side authorization guard
  await requireAnyPermission([
    PERMISSIONS.WAREHOUSES_READ,
    PERMISSIONS.WAREHOUSES_MANAGE,
  ]);

  return <AdminWarehousesManager />;
}
