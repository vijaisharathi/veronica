import { Metadata } from "next";
import { requireAnyPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminNotificationsManager } from "@/components/admin/admin-notifications-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications & Communication | VÉRONA Admin",
  description: "Monitor multi-channel communication dispatches, delivery attempts, retries, and provider logs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminNotificationsPage() {
  await requireAnyPermission([
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl font-serif tracking-tight text-stone-900">
          Communication & Notifications
        </h1>
        <p className="text-xs text-stone-500 mt-1 uppercase tracking-wider">
          Multi-channel delivery attempts, provider webhooks, and transactional audit logs
        </p>
      </div>

      <AdminNotificationsManager />
    </div>
  );
}
