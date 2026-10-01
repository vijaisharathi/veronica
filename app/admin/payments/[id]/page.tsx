import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { adminPaymentService } from "@/modules/admin/services/admin-payment.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment Details | VÉRONA Admin",
  description: "Detailed transaction review and gateway audit",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.PAYMENTS_READ);
  const { id } = await params;
  const payment = await adminPaymentService.getPaymentDetail(id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payments
        </Link>
        <span className="text-xs font-mono text-neutral-400">ID: {payment.id}</span>
      </div>

      <div className="border border-border rounded bg-background p-6 space-y-6 shadow-subtle">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded">
              <CreditCard className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Payment {payment.amountFormatted}
              </h1>
              <p className="text-xs text-neutral-400">
                Created on {new Date(payment.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded font-semibold">
            {payment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-neutral-400 uppercase text-[10px] block">Customer</span>
            <span className="font-medium text-foreground">{payment.customerName || "N/A"}</span>
            <span className="text-[11px] text-neutral-400 block">{payment.customerEmail}</span>
          </div>
          <div>
            <span className="text-neutral-400 uppercase text-[10px] block">Provider</span>
            <span className="font-medium text-foreground">{payment.provider}</span>
          </div>
          <div>
            <span className="text-neutral-400 uppercase text-[10px] block">Provider Order</span>
            <span className="font-mono text-foreground">{payment.providerOrderId || "N/A"}</span>
          </div>
          <div>
            <span className="text-neutral-400 uppercase text-[10px] block">Provider Payment</span>
            <span className="font-mono text-foreground">{payment.providerPaymentId || "N/A"}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Payment Attempts ({payment.attempts.length})
          </h2>
          <div className="divide-y divide-border border border-border rounded overflow-hidden">
            {payment.attempts.map((att, idx) => (
              <div key={att.attemptId || idx} className="p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-mono font-medium text-foreground">{att.attemptId}</p>
                  <p className="text-[11px] text-neutral-400">
                    {new Date(att.createdAt).toLocaleString("en-IN")}
                  </p>
                  {att.failureMessage && (
                    <p className="text-rose-600 text-[11px] mt-1">{att.failureMessage}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-medium">{att.amountFormatted}</span>
                  <span className="block text-[11px] font-mono text-neutral-400">{att.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
