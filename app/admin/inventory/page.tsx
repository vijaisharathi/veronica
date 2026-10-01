import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminInventoryManager } from "@/components/admin/admin-inventory-manager";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  // Server-side authorization guard
  await requireAnyPermission([
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_MANAGE,
  ]);

  return <AdminInventoryManager />;
}
