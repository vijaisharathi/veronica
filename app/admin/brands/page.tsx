import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminBrandsManager } from "@/components/admin/admin-brands-manager";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  await requirePermission(PERMISSIONS.BRANDS_READ);

  return <AdminBrandsManager />;
}
