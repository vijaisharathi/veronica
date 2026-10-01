import { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminPaymentsManager } from "@/components/admin/admin-payments-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payments & Reconciliation | VÉRONA Admin",
  description: "Operational overview of customer payments, payment attempts, and gateway reconciliation",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPaymentsPage() {
  // Server-side authorization guard
  await requirePermission(PERMISSIONS.PAYMENTS_READ);

  return <AdminPaymentsManager />;
}
