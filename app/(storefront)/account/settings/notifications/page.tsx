import { Metadata } from "next";
import { NotificationPreferencesView } from "@/components/notifications/notification-preferences-view";

export const metadata: Metadata = {
  title: "Notification Preferences | VÉRONA Atelier",
  description: "Manage your communication channels and update settings for VÉRONA Atelier.",
};

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <NotificationPreferencesView />
      </div>
    </div>
  );
}
