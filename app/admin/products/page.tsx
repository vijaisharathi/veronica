import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminProductsTable } from "@/components/admin/admin-products-table";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requirePermission(PERMISSIONS.PRODUCTS_READ);

  return <AdminProductsTable />;
}
