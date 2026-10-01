import { Metadata } from "next";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminReviewsManager } from "@/components/admin/admin-reviews-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews & Ratings Moderation | VÉRONA Admin",
  description: "Product reviews moderation, verified purchase validation, abuse reports, and aggregate reconciliation",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminReviewsPage() {
  // Server-side authorization guard
  await requireAnyPermission([
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.REVIEWS_MANAGE,
  ]);

  return (
    <div className="space-y-6">
      <AdminReviewsManager />
    </div>
  );
}
