import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminProductForm } from "@/components/admin/product-form/admin-product-form";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  return <AdminProductForm />;
}
