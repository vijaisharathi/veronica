import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { supportService } from "@/modules/support";
import { CustomerTicketThread } from "@/components/support/customer-ticket-thread";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ticketNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticketNumber } = await params;
  return {
    title: `Inquiry #${ticketNumber} | VÉRONA Atelier`,
    description: "View customer support inquiry thread and communicate with our concierge team.",
  };
}

export default async function CustomerTicketPage({ params }: PageProps) {
  let customer;
  try {
    customer = await requireCustomer();
  } catch {
    redirect("/sign-in");
  }

  const { ticketNumber } = await params;
  let ticketDetail;

  try {
    ticketDetail = await supportService.getCustomerTicket(customer._id.toString(), ticketNumber);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12 px-4 sm:px-6 lg:px-8">
      <CustomerTicketThread initialTicket={ticketDetail} />
    </div>
  );
}
