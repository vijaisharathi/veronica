import { Metadata } from "next";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminRefundsManager } from "@/components/admin/admin-refunds-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refunds & Settlements | VÉRONA Admin",
  description: "Authoritative financial settlement layer, gateway reversals, and reconciliation control",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminRefundsPage() {
  // Server-side authorization guard
  await requireAnyPermission([
    PERMISSIONS.REFUNDS_READ,
    PERMISSIONS.REFUNDS_MANAGE,
    PERMISSIONS.REFUNDS_PROCESS,
  ]);

  return (
    <div className="space-y-6">
      <AdminRefundsManager />
    </div>
  );
}
