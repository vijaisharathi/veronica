import { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations Command Center | VÉRONA Admin",
  description: "Real-time operations dashboard, KPI metrics, system health, and cross-domain controls",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDashboardPage() {
  // Server-side authorization guard
  await requirePermission(PERMISSIONS.DASHBOARD_READ);

  return <AdminDashboardView />;
}
