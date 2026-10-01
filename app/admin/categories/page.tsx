import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminCategoriesManager } from "@/components/admin/admin-categories-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requirePermission(PERMISSIONS.CATEGORIES_READ);

  return <AdminCategoriesManager />;
}
