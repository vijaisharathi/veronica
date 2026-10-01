import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminCustomersTable } from "@/components/admin/customers/admin-customers-table";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireAnyPermission([
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-normal text-foreground">
          Customer Administration
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          VÉRONA Client Directory • Account Status Governance • Lifetime Financial History
        </p>
      </div>

      <AdminCustomersTable />
    </div>
  );
}
