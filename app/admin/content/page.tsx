import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminContentHub } from "@/components/admin/admin-content-hub";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requirePermission(PERMISSIONS.CONTENT_READ);

  return <AdminContentHub />;
}
