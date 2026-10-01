import { Metadata } from "next";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminReturnsManager } from "@/components/admin/admin-returns-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Returns & Exchanges | VÉRONA Admin",
  description: "Manage reverse logistics, quality inspection, dispositions, and garment exchanges",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminReturnsPage() {
  // Server-side authorization guard
  await requireAnyPermission([
    PERMISSIONS.RETURNS_READ,
    PERMISSIONS.RETURNS_MANAGE,
    PERMISSIONS.RETURNS_REVIEW,
    PERMISSIONS.RETURNS_RECEIVE,
    PERMISSIONS.RETURNS_INSPECT,
    PERMISSIONS.EXCHANGES_READ,
    PERMISSIONS.EXCHANGES_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Returns & Exchanges Operations</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Authoritative reverse logistics: Returns Queue, QC Inspection, Inventory Restocking, and Size Exchanges.
        </p>
      </div>

      <AdminReturnsManager />
    </div>
  );
}
