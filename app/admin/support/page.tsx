import { Metadata } from "next";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminSupportManager } from "@/components/admin/admin-support-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Support Queue | VÉRONA Admin",
  description: "Customer support ticket triage, agent assignment, and conversation management",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminSupportPage() {
  await requireAnyPermission([
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <AdminSupportManager />
    </div>
  );
}
