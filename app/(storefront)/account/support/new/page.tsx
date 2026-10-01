import { Metadata } from "next";
import { CustomerCreateTicketView } from "@/components/support/customer-create-ticket-view";

export const metadata: Metadata = {
  title: "New Support Inquiry | VÉRONA Atelier",
  description: "Submit a new inquiry to the VÉRONA concierge team regarding orders, bespoke sizing, or care.",
};

export default function NewSupportInquiryPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12 px-4 sm:px-6 lg:px-8">
      <CustomerCreateTicketView />
    </div>
  );
}
