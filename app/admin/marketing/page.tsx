import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminMarketingManager } from "@/components/admin/admin-marketing-manager";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  await requireAnyPermission([PERMISSIONS.CAMPAIGNS_READ, PERMISSIONS.DISCOUNTS_READ]);

  return <AdminMarketingManager />;
}
