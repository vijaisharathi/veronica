import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminCollectionsManager } from "@/components/admin/admin-collections-manager";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  await requirePermission(PERMISSIONS.COLLECTIONS_READ);

  return <AdminCollectionsManager />;
}
