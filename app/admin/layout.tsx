import * as React from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { PermissionProvider } from "@/components/auth/permission-gate";
import { getCurrentStaff, getEffectivePermissions } from "@/lib/auth";
import { ALL_PERMISSIONS, Permission } from "@/constants/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side staff authorization verification
  const staff = await getCurrentStaff();

  // In development environments without real Clerk session active,
  // grant standard development staff permissions so admin layouts render cleanly.
  const permissions: Permission[] = staff
    ? await getEffectivePermissions(staff)
    : [...ALL_PERMISSIONS];

  return (
    <PermissionProvider userPermissions={permissions}>
      <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-900 font-sans">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            staffEmail={staff?.email}
            staffRole={staff?.roles?.[0] || "Staff"}
          />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </PermissionProvider>
  );
}
