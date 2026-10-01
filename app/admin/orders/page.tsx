import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminOrdersManager } from "@/components/admin/admin-orders-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  // Server-side authorization guard
  await requirePermission(PERMISSIONS.ORDERS_READ);

  return <AdminOrdersManager />;
}
