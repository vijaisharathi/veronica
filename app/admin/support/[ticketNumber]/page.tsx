import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { supportService } from "@/modules/support";
import { AdminSupportTicketDetail } from "@/components/admin/admin-support-ticket-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ticketNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticketNumber } = await params;
  return {
    title: `Ticket #${ticketNumber} | VÉRONA Support Console`,
    description: "Manage customer support conversation, internal notes, and service level adherence",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminTicketDetailPage({ params }: PageProps) {
  await requireAnyPermission([
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_MANAGE,
  ]);

  const { ticketNumber } = await params;
  let ticketDetail;

  try {
    ticketDetail = await supportService.getAdminTicket(ticketNumber);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminSupportTicketDetail initialTicket={ticketDetail} />
    </div>
  );
}
