import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminCustomerDetailView } from "@/components/admin/customers/admin-customer-detail-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  await requireAnyPermission([
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_MANAGE,
  ]);

  const { id } = await params;

  return (
    <div className="space-y-6">
      <AdminCustomerDetailView customerId={id} />
    </div>
  );
}
