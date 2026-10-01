import { Metadata } from "next";
import { CustomerSupportList } from "@/components/support/customer-support-list";

export const metadata: Metadata = {
  title: "Support Inquiries | VÉRONA Atelier",
  description: "View and manage your concierge support inquiries, order requests, and customer care records.",
};

export default function AccountSupportPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <CustomerSupportList />
      </div>
    </div>
  );
}
