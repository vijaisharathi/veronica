"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { RefundStatus } from "@/constants/status";
import { CustomerRefundDetailDTO } from "@/modules/refunds/types/refund.types";
import { formatMoney } from "@/lib/money";

interface PageProps {
  params: Promise<{ refundNumber: string }>;
}

export default function CustomerRefundDetailPage({ params }: PageProps) {
  const { refundNumber } = use(params);
  const [refund, setRefund] = useState<CustomerRefundDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/account/refunds/${refundNumber}`);
        if (!res.ok) {
          throw new Error("Unable to retrieve refund details");
        }
        const data = await res.json();
        setRefund(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load refund");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [refundNumber]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-20 px-4 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="h-6 w-6 text-primary" />
        <p className="text-xs font-mono">Loading settlement progress...</p>
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-4">
        <Link
          href="/account/refunds"
          className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Refunds
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <p className="font-semibold text-sm">Refund Record Not Found</p>
          <p className="mt-1">{error || "Unable to display refund details."}</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.COMPLETED:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1 font-mono text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            COMPLETED
          </Badge>
        );
      case RefundStatus.FAILED:
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400 gap-1 font-mono text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            FAILED
          </Badge>
        );
      case RefundStatus.PROCESSING:
      case RefundStatus.INITIATED:
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 gap-1 font-mono text-xs">
            <Clock className="h-3.5 w-3.5" />
            PROCESSING
          </Badge>
        );
      case RefundStatus.RECONCILIATION_REQUIRED:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400 gap-1 font-mono text-xs">
            <HelpCircle className="h-3.5 w-3.5" />
            PENDING RECONCILIATION
          </Badge>
        );
      case RefundStatus.REQUESTED:
      case RefundStatus.ELIGIBLE:
      default:
        return (
          <Badge className="bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 gap-1 font-mono text-xs">
            <Clock className="h-3.5 w-3.5" />
            REQUESTED
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 space-y-8">
      {/* Navigation */}
      <div className="space-y-4">
        <Link
          href="/account/refunds"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Refunds
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-foreground">
                {refund.refundNumber}
              </h1>
              {getStatusBadge(refund.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Initiated on {new Date(refund.initiatedAt).toLocaleString()}
              {refund.orderNumber && (
                <span>
                  {" "}• Related Order:{" "}
                  <Link
                    href={`/account/orders/${refund.orderNumber}`}
                    className="text-primary hover:underline font-mono"
                  >
                    {refund.orderNumber}
                  </Link>
                </span>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Settlement Amount
            </p>
            <p className="font-mono text-2xl font-bold text-foreground">
              {formatMoney(refund.amountMinor, refund.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Refund Progress Timeline */}
      <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Settlement Progress Timeline
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            Original Payment Method Reversal
          </span>
        </div>

        <div className="relative pl-6 md:pl-8 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {refund.timeline.map((step, idx) => (
            <div key={step.status} className="relative flex items-start gap-4">
              <div
                className={`absolute -left-[29px] md:-left-[37px] top-0.5 h-6 w-6 rounded-full border flex items-center justify-center transition ${
                  step.completed
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[10px] font-mono">{idx + 1}</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs font-semibold ${
                      step.completed ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.completed && (
                    <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 text-emerald-600 border-emerald-500/30">
                      DONE
                    </Badge>
                  )}
                </div>
                {step.timestamp && (
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {new Date(step.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refund Information & Returned Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settlement Summary */}
        <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5" />
            Settlement Details
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Settlement Type</span>
              <span className="font-mono font-medium text-foreground">
                {refund.type.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Destination</span>
              <span className="font-mono text-foreground">Original Payment Method</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-mono text-foreground">{refund.currency}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Recorded Reason</span>
              <span className="text-foreground max-w-[200px] text-right truncate">
                {refund.reason}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground font-semibold">Total Credited</span>
              <span className="font-mono font-bold text-foreground">
                {formatMoney(refund.amountMinor, refund.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Banking Notice */}
        <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Banking & Processing Notice
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Refunds are dispatched back to your original payment instrument (credit card, debit card, UPI, or net banking).
              Depending on your financial institution, funds typically reflect in your account within 5 to 7 business days from the completion date.
            </p>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-[11px] text-muted-foreground space-y-1 font-mono">
            <p className="font-medium text-foreground">Need assistance with your credit?</p>
            <p>Reference: {refund.refundNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
