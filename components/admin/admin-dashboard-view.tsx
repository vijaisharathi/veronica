/**
 * VÉRONA — Central Operations Dashboard View (Phase 27)
 *
 * Production-ready operational cockpit providing:
 * - Date range selection (Today, Yesterday, 7D, 30D)
 * - Permission-gated KPI metrics with trend comparisons
 * - Centralized operational alerts (CRITICAL, WARNING, INFO) with drill-down links
 * - Cross-domain operational widgets (Orders, Fulfillment, Inventory, Warehouses, Payments, Refunds, Support, Reviews, Notifications)
 * - Partial widget failure resilience with local retry
 * - Global search integration (Cmd/Ctrl + K)
 */

"use client";

import * as React from "react";
import Link from "next/link";
import {
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShoppingBag,
  Warehouse,
  CreditCard,
  LifeBuoy,
  Package,
  Sparkles,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminSearchModal } from "./admin-search-modal";
import {
  AdminDashboardDTO,
  DateRangeOption,
} from "@/modules/admin/types/admin.types";

export function AdminDashboardView() {
  const [range, setRange] = React.useState<DateRangeOption>("TODAY");
  const [dashboard, setDashboard] = React.useState<AdminDashboardDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Keyboard shortcut for Cmd/Ctrl + K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchDashboard = React.useCallback(async (selectedRange: DateRangeOption) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${selectedRange}`);
      if (!res.ok) {
        throw new Error("Failed to load operations dashboard");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setDashboard(json.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard(range);
  }, [range, fetchDashboard]);

  const handleRangeChange = (newRange: DateRangeOption) => {
    setRange(newRange);
  };

  const RANGE_OPTIONS: Array<{ key: DateRangeOption; label: string }> = [
    { key: "TODAY", label: "Today" },
    { key: "YESTERDAY", label: "Yesterday" },
    { key: "LAST_7_DAYS", label: "Last 7 Days" },
    { key: "LAST_30_DAYS", label: "Last 30 Days" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header: Title, Controls, Search Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-normal text-foreground">
              Operations Command Center
            </h1>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative operational metrics, active system health, and cross-domain controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Global Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-background border border-border rounded shadow-subtle hover:border-neutral-400 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="px-1 py-0.2 text-[10px] font-mono border rounded bg-neutral-100 dark:bg-neutral-800">
              ⌘K
            </kbd>
          </button>

          {/* Date Range Selector */}
          <div className="flex items-center bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleRangeChange(opt.key)}
                className={`px-2.5 py-1 font-medium rounded transition-colors ${
                  range === opt.key
                    ? "bg-white dark:bg-neutral-900 text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(range)}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Staff Context & Warehouse Scope Banner */}
      {dashboard?.staff && (
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-medium text-xs">
              {dashboard.staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-semibold text-foreground">{dashboard.staff.name}</span>
              <span className="text-neutral-400 ml-2">({dashboard.staff.email})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded font-medium uppercase tracking-wider">
              {dashboard.staff.role}
            </span>
            {dashboard.staff.assignedWarehouseId && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded font-mono font-medium">
                Warehouse Scoped: {dashboard.staff.assignedWarehouseId}
              </span>
            )}
            <span className="text-neutral-400">
              Synced: {new Date(dashboard.freshnessTimestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                Dashboard Aggregation Error
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchDashboard(range)} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Partial failures notice if any */}
      {dashboard?.partialFailures && dashboard.partialFailures.length > 0 && (
        <div className="p-4 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 rounded text-xs space-y-1">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Partial Dashboard Degraded</span>
          </div>
          <p className="text-amber-700 dark:text-amber-300 text-[11px]">
            The following widgets encountered temporary backend issues:{" "}
            {dashboard.partialFailures.map((pf) => pf.widget).join(", ")}. Remaining operational areas continue operating normally.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !dashboard && (
        <div className="p-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner className="h-8 w-8 text-foreground" />
          <span className="text-xs font-medium">Compiling operational metrics across domains...</span>
        </div>
      )}

      {dashboard && (
        <>
          {/* Operational Alerts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Operational Alerts ({dashboard.alerts.length})
              </h2>
            </div>

            {dashboard.alerts.length === 0 ? (
              <div className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 rounded flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>All operational subsystems (Orders, Logistics, Warehouses, Payments, Support) are operating within nominal thresholds.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboard.alerts.map((alert) => {
                  const isCritical = alert.severity === "CRITICAL";
                  const isWarning = alert.severity === "WARNING";
                  const borderClass = isCritical
                    ? "border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40"
                    : isWarning
                    ? "border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40"
                    : "border-blue-300 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40";
                  const badgeClass = isCritical
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                    : isWarning
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded border shadow-subtle flex flex-col justify-between ${borderClass}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${badgeClass}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            {alert.resourceType}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-foreground">{alert.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {alert.description}
                        </p>
                      </div>

                      <div className="pt-3">
                        <Link
                          href={alert.href}
                          className="inline-flex items-center text-xs font-medium text-foreground hover:underline gap-1"
                        >
                          Resolve Issue
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KPI Metrics Cards Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Performance Indicators
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {dashboard.kpis.map((kpi) => {
                const isCritical = kpi.status === "CRITICAL";
                const isWarning = kpi.status === "WARNING";
                const borderClass = isCritical
                  ? "border-rose-400 dark:border-rose-800"
                  : isWarning
                  ? "border-amber-400 dark:border-amber-800"
                  : "border-border";

                return (
                  <div
                    key={kpi.key}
                    className={`p-4 bg-background rounded border shadow-subtle flex flex-col justify-between ${borderClass}`}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block truncate">
                        {kpi.label}
                      </span>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {kpi.formattedValue}
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-[11px]">
                      {kpi.trend ? (
                        <div
                          className={`flex items-center gap-0.5 font-medium ${
                            kpi.trend === "UP" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {kpi.trend === "UP" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{kpi.trendPercentage}%</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[10px]">Real-time</span>
                      )}

                      {kpi.href && (
                        <Link
                          href={kpi.href}
                          className="text-neutral-400 hover:text-foreground text-[10px]"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Domain Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders & Fulfillment Widget */}
            {dashboard.orders && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Orders & Fulfillment Backlog</h3>
                  </div>
                  <Link href="/admin/orders" className="text-xs text-neutral-500 hover:text-foreground">
                    View All Orders →
                  </Link>
                </div>

                {/* Pipeline Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Pending</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.orders.ordersPending}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Confirmed</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.orders.ordersConfirmed}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Processing</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.orders.ordersProcessing}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Shipped</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.orders.ordersShipped}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Delivered</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.orders.ordersDelivered}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Cancelled</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.orders.ordersCancelled}</span>
                  </div>
                </div>

                {/* Recent Orders List */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Recent Customer Purchases
                  </h4>
                  <div className="divide-y divide-border border border-border rounded overflow-hidden">
                    {dashboard.orders.recentOrders.map((ro) => (
                      <div key={ro.orderNumber} className="p-2.5 flex items-center justify-between text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <div>
                          <Link href={`/admin/orders?search=${ro.orderNumber}`} className="font-mono font-medium text-foreground hover:underline">
                            #{ro.orderNumber}
                          </Link>
                          <span className="text-[11px] text-neutral-400 ml-2">{ro.customerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">{ro.totalAmountFormatted}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 rounded">
                            {ro.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Inventory & Warehouses Widget */}
            {dashboard.inventory && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Inventory Health & Warehouse Stock</h3>
                  </div>
                  <Link href="/admin/inventory" className="text-xs text-neutral-500 hover:text-foreground">
                    Manage Stock →
                  </Link>
                </div>

                {/* Inventory Status Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Total Variants</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.inventory.totalVariants}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">In Stock</span>
                    <span className="font-bold text-sm text-emerald-600">{dashboard.inventory.inStockVariants}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Low Stock</span>
                    <span className="font-bold text-sm text-amber-600">{dashboard.inventory.lowStockVariants}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Out of Stock</span>
                    <span className="font-bold text-sm text-rose-600">{dashboard.inventory.outOfStockVariants}</span>
                  </div>
                </div>

                {/* Critical Shortages List */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Depleted Garment Variants
                  </h4>
                  {dashboard.inventory.criticalShortages.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic p-3 border border-border rounded text-center">
                      No critical stock shortages. All variants meet reorder safety thresholds.
                    </p>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded overflow-hidden">
                      {dashboard.inventory.criticalShortages.map((cs) => (
                        <div key={cs.sku} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-medium text-foreground">{cs.sku}</span>
                            <span className="text-[11px] text-neutral-400 ml-2">{cs.productName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-rose-600 font-bold font-mono">0 available</span>
                            <span className="text-[10px] text-neutral-400">Reorder at {cs.reorderThreshold}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial & Settlement Widget */}
            {dashboard.payments && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Payments & Gateway Settlement</h3>
                  </div>
                  <Link href="/admin/payments" className="text-xs text-neutral-500 hover:text-foreground">
                    Reconciliation →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Collected</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.payments.revenueTodayFormatted}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Captured</span>
                    <span className="font-bold text-sm text-emerald-600">{dashboard.payments.capturedCount}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Pending</span>
                    <span className="font-bold text-sm text-amber-600">{dashboard.payments.pendingCount}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Failed</span>
                    <span className="font-bold text-sm text-rose-600">{dashboard.payments.failedCount}</span>
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Latest Transactions
                  </h4>
                  <div className="divide-y divide-border border border-border rounded overflow-hidden">
                    {dashboard.payments.recentPayments.map((rp) => (
                      <div key={rp.paymentId} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-foreground">{rp.orderReference || rp.paymentId.slice(-8)}</span>
                          <span className="text-[11px] text-neutral-400 ml-2">{rp.provider}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">{rp.amountFormatted}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 rounded">
                            {rp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Operations & Support Widget */}
            {dashboard.support && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Customer Support & SLA Tracking</h3>
                  </div>
                  <Link href="/admin/support" className="text-xs text-neutral-500 hover:text-foreground">
                    Support Desk →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Open</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.support.openTickets}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Urgent</span>
                    <span className="font-bold text-sm text-rose-600">{dashboard.support.urgentTickets}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Unassigned</span>
                    <span className="font-bold text-sm text-amber-600">{dashboard.support.unassignedTickets}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">SLA At Risk</span>
                    <span className="font-bold text-sm text-amber-600">{dashboard.support.slaAtRisk}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Breached</span>
                    <span className="font-bold text-sm text-rose-600">{dashboard.support.slaBreached}</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-foreground">Support Operations Action</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Ensure all high-priority customer inquiries have designated staff responders.
                    </p>
                  </div>
                  <Link href="/admin/support?priority=URGENT">
                    <Button variant="outline" size="sm" className="text-xs">
                      View Queue
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Catalog Management Widget (Phase 28) */}
            {dashboard.catalog && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Catalog & Product Lifecycle</h3>
                  </div>
                  <Link href="/admin/products" className="text-xs text-neutral-500 hover:text-foreground">
                    Manage Catalog →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Total Styles</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.catalog.totalProducts}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Published</span>
                    <span className="font-bold text-sm text-emerald-600">{dashboard.catalog.publishedProducts}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">In Draft</span>
                    <span className="font-bold text-sm text-amber-600">{dashboard.catalog.draftProducts}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Archived</span>
                    <span className="font-bold text-sm text-neutral-400">{dashboard.catalog.archivedProducts}</span>
                  </div>
                </div>

                {dashboard.catalog.recentlyUpdated?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      Recently Updated Styles
                    </h4>
                    <div className="divide-y divide-border border border-border rounded overflow-hidden">
                      {dashboard.catalog.recentlyUpdated.map((prod) => (
                        <div key={prod.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <Link href={`/admin/products/${prod.id}`} className="font-medium text-foreground hover:underline">
                              {prod.title}
                            </Link>
                            <span className="text-[10px] text-neutral-400 block font-mono">/{prod.slug}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                            prod.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-neutral-100 dark:bg-neutral-800"
                          }`}>
                            {prod.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Marketing & Campaign Operations Widget (Phase 28) */}
            {dashboard.marketing && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Marketing & Campaign Cockpit</h3>
                  </div>
                  <Link href="/admin/marketing" className="text-xs text-neutral-500 hover:text-foreground">
                    All Campaigns →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Active Live</span>
                    <span className="font-bold text-sm text-emerald-600">{dashboard.marketing.activeCampaigns}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Scheduled</span>
                    <span className="font-bold text-sm text-blue-600">{dashboard.marketing.scheduledCampaigns}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Paused</span>
                    <span className="font-bold text-sm text-amber-600">{dashboard.marketing.pausedCampaigns}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Live Banners</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.marketing.activeBanners}</span>
                  </div>
                </div>

                {dashboard.marketing.expiringCampaigns?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                      Expiring Soon (Next 48 Hours)
                    </h4>
                    <div className="divide-y divide-border border border-border rounded overflow-hidden">
                      {dashboard.marketing.expiringCampaigns.map((camp) => (
                        <div key={camp.id} className="p-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{camp.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Ends {new Date(camp.endAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Operations Cockpit (Phase 29) */}
            {dashboard.customers && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Customer Operations</h3>
                  </div>
                  <Link href="/admin/customers" className="text-xs text-neutral-500 hover:text-foreground">
                    Directory →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Total Clients</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.customers.totalCustomers}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">New In Period</span>
                    <span className="font-bold text-sm text-blue-600">{dashboard.customers.newCustomersInPeriod}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Active</span>
                    <span className="font-bold text-sm text-emerald-600">{dashboard.customers.activeCustomers}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Suspended</span>
                    <span className="font-bold text-sm text-rose-600">{dashboard.customers.suspendedCustomers}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Workforce Operations Cockpit (Phase 29) */}
            {dashboard.workforce && (
              <div className="border border-border rounded bg-background p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Workforce & Roles</h3>
                  </div>
                  <Link href="/admin/staff" className="text-xs text-neutral-500 hover:text-foreground">
                    Staff & RBAC →
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Total Staff</span>
                    <span className="font-bold text-sm text-foreground">{dashboard.workforce.totalStaff}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Active</span>
                    <span className="font-bold text-sm text-emerald-600">{dashboard.workforce.activeStaff}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Suspended</span>
                    <span className="font-bold text-sm text-rose-600">{dashboard.workforce.suspendedStaff}</span>
                  </div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-border">
                    <span className="text-[10px] text-neutral-400 uppercase block">Roles</span>
                    <span className="font-bold text-sm text-primary">{dashboard.workforce.totalRoles}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Global Search Modal */}
      <AdminSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
