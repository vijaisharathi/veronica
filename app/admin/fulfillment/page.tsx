import { Metadata } from "next";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminFulfillmentManager } from "@/components/admin/admin-fulfillment-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fulfillment & Shipping | VÉRONA Admin",
  description: "Manage warehouse fulfillment orders, packages, shipments, and tracking",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminFulfillmentPage() {
  // Server-side authorization guard
  await requireAnyPermission([
    PERMISSIONS.FULFILLMENT_READ,
    PERMISSIONS.FULFILLMENT_MANAGE,
    PERMISSIONS.FULFILLMENT_PICK,
    PERMISSIONS.FULFILLMENT_PACK,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Fulfillment & Shipping</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Authoritative warehouse operations: Pick, Pack, Package Creation, Carrier Booking, and AWB Tracking.
        </p>
      </div>

      <AdminFulfillmentManager />
    </div>
  );
}
