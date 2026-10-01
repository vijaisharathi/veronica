import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminPlatformSettingsView } from "@/components/admin/settings/admin-platform-settings-view";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAnyPermission([
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-normal text-foreground">
          System & Platform Settings
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          VÉRONA Global Configuration • Localization & Brand Parameters • Operational Feature Toggles
        </p>
      </div>

      <AdminPlatformSettingsView />
    </div>
  );
}
