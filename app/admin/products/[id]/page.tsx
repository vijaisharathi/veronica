import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { adminCatalogService } from "@/modules/catalog/admin-catalog.service";
import { AdminProductForm } from "@/components/admin/product-form/admin-product-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: PageProps) {
  await requirePermission(PERMISSIONS.PRODUCTS_READ);
  const { id } = await params;

  try {
    const product = await adminCatalogService.getProductDetail(id);
    return <AdminProductForm initialData={product} isEditing />;
  } catch {
    notFound();
  }
}
