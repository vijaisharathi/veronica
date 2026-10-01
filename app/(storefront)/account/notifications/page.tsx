import { Metadata } from "next";
import { NotificationCenter } from "@/components/notifications/notification-center";

export const metadata: Metadata = {
  title: "Notifications | VÉRONA Atelier",
  description: "View verified notifications, fulfillment waybills, and account updates.",
};

export default function AccountNotificationsPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <NotificationCenter />
      </div>
    </div>
  );
}
