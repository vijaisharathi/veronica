"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShoppingBag,
  RotateCcw,
  Star,
  LifeBuoy,
  MapPin,
  Clock,
  ShieldAlert,
  RefreshCw,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { CustomerStatus } from "@/constants/status";
import { AdminCustomerDetailDTO } from "@/modules/admin/types/admin-management.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  customerId: string;
}

export function AdminCustomerDetailView({ customerId }: Props) {
  const [customer, setCustomer] = React.useState<AdminCustomerDetailDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "OVERVIEW" | "ORDERS" | "RETURNS" | "REVIEWS" | "SUPPORT" | "ADDRESSES"
  >("OVERVIEW");

  // Status Action Modal State
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [statusReason, setStatusReason] = React.useState("");
  const [actionInProgress, setActionInProgress] = React.useState(false);

  const fetchCustomer = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load customer profile");
      }

      setCustomer(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading customer");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleStatusTransition = async () => {
    if (!customer) return;
    try {
      setActionInProgress(true);
      const isSuspended = customer.status === CustomerStatus.SUSPENDED;
      const endpoint = isSuspended
        ? `/api/admin/customers/${customer.id}/restore`
        : `/api/admin/customers/${customer.id}/suspend`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: statusReason.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to change customer status");
      }

      setStatusModalOpen(false);
      setStatusReason("");
      fetchCustomer();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="font-serif">Assembling client operational portfolio...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 border border-rose-500/30 bg-rose-500/10 rounded-sm text-center space-y-4">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-serif font-medium text-foreground">
          {error || "Customer Not Found"}
        </h2>
        <Link href="/admin/customers">
          <Button variant="outline" size="sm">
            Return to Customer Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>

        <div className="flex items-center gap-2">
          {customer.status === CustomerStatus.ACTIVE ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusModalOpen(true);
                setStatusReason("");
              }}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs"
            >
              Suspend Account
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusModalOpen(true);
                setStatusReason("");
              }}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs"
            >
              Restore Account
            </Button>
          )}
        </div>
      </div>

      {/* Client Identity Header Card */}
      <div className="p-6 border border-border bg-card rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border border-border text-foreground font-serif text-2xl">
            {customer.firstName.charAt(0)}
            {customer.lastName.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-medium text-foreground">
                {customer.firstName} {customer.lastName}
              </h1>
              {customer.status === CustomerStatus.ACTIVE ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-xs">
                  Suspended
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
              <span>{customer.email}</span>
              {customer.phone && <span>• {customer.phone}</span>}
              <span>• ID: {customer.id}</span>
            </div>
          </div>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
          <div>
            <p className="text-[10px] uppercase font-mono text-muted-foreground">
              Lifetime Orders
            </p>
            <p className="text-xl font-serif font-medium text-foreground mt-0.5">
              {customer.orderSummary.totalOrders}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-muted-foreground">
              Total Spend
            </p>
            <p className="text-xl font-serif font-medium text-foreground mt-0.5">
              ₹{(customer.orderSummary.totalSpendMinor / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-muted-foreground">
              Registered
            </p>
            <p className="text-xs font-mono text-foreground mt-1">
              {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Operational Domain Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto text-sm font-mono">
        {[
          { key: "OVERVIEW", label: "Overview & Timeline", icon: Clock },
          { key: "ORDERS", label: `Orders (${customer.orderSummary.totalOrders})`, icon: ShoppingBag },
          { key: "RETURNS", label: `Returns & Refunds (${customer.returnSummary.totalReturns})`, icon: RotateCcw },
          { key: "REVIEWS", label: `Reviews (${customer.reviewSummary.totalReviews})`, icon: Star },
          { key: "SUPPORT", label: `Support Tickets (${customer.supportSummary.totalTickets})`, icon: LifeBuoy },
          { key: "ADDRESSES", label: `Addresses (${customer.addresses.length})`, icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 px-3 flex items-center gap-2 border-b-2 text-xs uppercase tracking-wider transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity & Preferences Card */}
          <div className="p-5 border border-border bg-card rounded-sm space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Details
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-medium text-foreground">
                  {customer.firstName} {customer.lastName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground">{customer.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono text-foreground">{customer.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email Verified:</span>
                <span>{customer.emailVerified ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Phone Verified:</span>
                <span>{customer.phoneVerified ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Last Login:</span>
                <span className="font-mono text-muted-foreground">
                  {customer.lastLoginAt
                    ? new Date(customer.lastLoginAt).toLocaleString("en-IN")
                    : "Never"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Notification Preferences
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marketing Email:</span>
                  <span>{customer.preferences.marketingEmail ? "Opted In" : "Opted Out"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marketing SMS:</span>
                  <span>{customer.preferences.marketingSms ? "Opted In" : "Opted Out"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp Alerts:</span>
                  <span>{customer.preferences.marketingWhatsapp ? "Opted In" : "Opted Out"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline Card */}
          <div className="lg:col-span-2 p-5 border border-border bg-card rounded-sm space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Activity Timeline
            </h3>

            {customer.activityTimeline.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No activity records available.
              </p>
            ) : (
              <div className="space-y-4 border-l border-border pl-4 ml-2">
                {customer.activityTimeline.map((item) => (
                  <div key={item.id} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.title}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ORDERS" && (
        <div className="border border-border bg-card rounded-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted-foreground">
              Total Order History ({customer.orderSummary.totalOrders})
            </span>
            <span className="text-xs font-mono text-foreground font-semibold">
              Total Spend: ₹{(customer.orderSummary.totalSpendMinor / 100).toFixed(2)}
            </span>
          </div>
          {customer.orderSummary.recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No orders placed by this customer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-4">Order #</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 px-4">Total</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {customer.orderSummary.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-semibold text-primary">
                        <Link href={`/admin/orders/${o.orderNumber}`}>{o.orderNumber}</Link>
                      </td>
                      <td className="py-2.5 px-4">{o.status}</td>
                      <td className="py-2.5 px-4">{o.paymentStatus}</td>
                      <td className="py-2.5 px-4">₹{(o.finalPriceMinor / 100).toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "RETURNS" && (
        <div className="space-y-6">
          <div className="border border-border bg-card rounded-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <span className="text-xs font-mono uppercase text-muted-foreground">
                Returns Requested ({customer.returnSummary.totalReturns})
              </span>
            </div>
            {customer.returnSummary.recentReturns.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No return requests registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4">Return #</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-xs">
                    {customer.returnSummary.recentReturns.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-semibold">{r.returnNumber}</td>
                        <td className="py-2.5 px-4">{r.returnType}</td>
                        <td className="py-2.5 px-4">{r.status}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-border bg-card rounded-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-muted-foreground">
                Refunds ({customer.refundSummary.totalRefunds})
              </span>
              <span className="text-xs font-mono text-foreground font-semibold">
                Total Refunded: ₹{(customer.refundSummary.totalRefundedMinor / 100).toFixed(2)}
              </span>
            </div>
            {customer.refundSummary.recentRefunds.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No refunds processed.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4">Refund #</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-xs">
                    {customer.refundSummary.recentRefunds.map((ref) => (
                      <tr key={ref.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-semibold">{ref.refundNumber}</td>
                        <td className="py-2.5 px-4">₹{(ref.amountMinor / 100).toFixed(2)}</td>
                        <td className="py-2.5 px-4">{ref.status}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {new Date(ref.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "REVIEWS" && (
        <div className="p-6 border border-border bg-card rounded-sm space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 border border-border rounded-sm">
              <p className="text-xs text-muted-foreground uppercase font-mono">Average Rating</p>
              <p className="text-2xl font-serif mt-1 font-semibold text-foreground">
                {customer.reviewSummary.averageRating} ★
              </p>
            </div>
            <div className="p-4 border border-border rounded-sm">
              <p className="text-xs text-muted-foreground uppercase font-mono">Published</p>
              <p className="text-2xl font-serif mt-1 font-semibold text-emerald-600">
                {customer.reviewSummary.publishedReviews}
              </p>
            </div>
            <div className="p-4 border border-border rounded-sm">
              <p className="text-xs text-muted-foreground uppercase font-mono">Pending</p>
              <p className="text-2xl font-serif mt-1 font-semibold text-amber-600">
                {customer.reviewSummary.pendingReviews}
              </p>
            </div>
            <div className="p-4 border border-border rounded-sm">
              <p className="text-xs text-muted-foreground uppercase font-mono">Rejected / Hidden</p>
              <p className="text-2xl font-serif mt-1 font-semibold text-rose-600">
                {customer.reviewSummary.rejectedReviews}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "SUPPORT" && (
        <div className="border border-border bg-card rounded-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted-foreground">
              Customer Support Backlog ({customer.supportSummary.totalTickets})
            </span>
            <span className="text-xs font-mono text-amber-600 font-semibold">
              {customer.supportSummary.openTickets} Open / In Progress
            </span>
          </div>
          {customer.supportSummary.recentTickets.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No support tickets filed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-4">Ticket #</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {customer.supportSummary.recentTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-mono font-semibold text-primary">
                        <Link href={`/admin/support/${t.ticketNumber}`}>{t.ticketNumber}</Link>
                      </td>
                      <td className="py-2.5 px-4 text-foreground">{t.subject}</td>
                      <td className="py-2.5 px-4 font-mono">{t.priority}</td>
                      <td className="py-2.5 px-4 font-mono">{t.status}</td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "ADDRESSES" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customer.addresses.length === 0 ? (
            <div className="col-span-2 p-8 border border-border bg-card rounded-sm text-center text-xs text-muted-foreground">
              No saved operational addresses found for this client.
            </div>
          ) : (
            customer.addresses.map((addr) => (
              <div key={addr.id} className="p-5 border border-border bg-card rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {addr.type}
                  </span>
                  {addr.isDefault && (
                    <Badge variant="outline" className="border-primary text-primary text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="text-xs space-y-0.5 text-muted-foreground">
                  <p className="font-medium text-foreground">{addr.fullName}</p>
                  <p>{addr.addressLine1}</p>
                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                  {addr.landmark && <p>Landmark: {addr.landmark}</p>}
                  <p>
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                  <p>{addr.country}</p>
                  <p className="font-mono pt-1 text-[11px]">Phone: {addr.phone}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal for Suspension / Restoration */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  customer.status === CustomerStatus.ACTIVE
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  {customer.status === CustomerStatus.ACTIVE ? "Suspend Account" : "Restore Account"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {customer.email}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {customer.status === CustomerStatus.ACTIVE
                ? "Suspending this client will revoke access to the checkout and customer portal immediately. Existing data will not be destroyed."
                : "Restoring this client will re-enable standard platform authentication and commerce access."}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-muted-foreground">
                Audit Reason
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Reason for status transition (minimum 3 characters)..."
                rows={3}
                className="w-full p-2.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(false)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                variant={customer.status === CustomerStatus.ACTIVE ? "destructive" : "primary"}
                size="sm"
                onClick={handleStatusTransition}
                disabled={actionInProgress || statusReason.trim().length < 3}
                className="gap-1.5"
              >
                {actionInProgress && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm {customer.status === CustomerStatus.ACTIVE ? "Suspension" : "Restoration"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
