"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Package,
  Layers,
  Building2,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  ReturnStatus,
  ExchangeStatus,
  ReturnType,
  ReturnReason,
  InspectionResult,
  ReturnItemCondition,
  ReturnDisposition,
} from "@/constants/status";
import {
  ReturnAdminDto,
  ExchangeAdminDto,
} from "@/modules/returns/types/return.types";
import { WarehouseDto } from "@/modules/inventory/types/inventory.types";
import { formatMoney } from "@/lib/money";

export function AdminReturnsManager() {
  const [activeTab, setActiveTab] = React.useState<
    "returns" | "exchanges" | "receiving" | "inspection" | "disposition"
  >("returns");

  const [returns, setReturns] = React.useState<ReturnAdminDto[]>([]);
  const [exchanges, setExchanges] = React.useState<ExchangeAdminDto[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Detail Modal
  const [selectedReturn, setSelectedReturn] = React.useState<ReturnAdminDto | null>(null);
  const [selectedExchange, setSelectedExchange] = React.useState<ExchangeAdminDto | null>(null);

  // Operation Modals
  const [reviewModalOpen, setReviewModalOpen] = React.useState(false);
  const [schedulePickupModalOpen, setSchedulePickupModalOpen] = React.useState(false);
  const [confirmPickupModalOpen, setConfirmPickupModalOpen] = React.useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = React.useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = React.useState(false);
  const [actionReturn, setActionReturn] = React.useState<ReturnAdminDto | null>(null);

  // Operation Form states
  const [submitting, setSubmitting] = React.useState(false);
  const [targetWarehouseId, setTargetWarehouseId] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [pickupCarrier, setPickupCarrier] = React.useState("MANUAL");

  // Inspection form items
  const [inspectionFormItems, setInspectionFormItems] = React.useState<
    Record<
      string,
      {
        result: InspectionResult;
        condition: ReturnItemCondition;
        notes: string;
        disposition: ReturnDisposition;
      }
    >
  >({});

  // Fetch warehouses
  const fetchWarehouses = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/warehouses");
      const json = await res.json();
      if (res.ok && json.success) {
        setWarehouses(json.data?.warehouses || []);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // Fetch data based on tab
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "exchanges") {
        const query = new URLSearchParams({ limit: "50" });
        if (search) query.set("search", search);
        if (statusFilter !== "ALL") query.set("status", statusFilter);

        const res = await fetch(`/api/admin/exchanges?${query.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to load exchanges");
        }
        setExchanges(json.data.items || []);
      } else {
        const query = new URLSearchParams({ limit: "50" });
        if (search) query.set("search", search);
        if (warehouseFilter) query.set("warehouseId", warehouseFilter);

        if (activeTab === "receiving") {
          query.set("status", ReturnStatus.PICKED_UP);
        } else if (activeTab === "inspection") {
          query.set("status", ReturnStatus.RECEIVED);
        } else if (activeTab === "disposition") {
          query.set("status", ReturnStatus.INSPECTION);
        } else if (statusFilter !== "ALL") {
          query.set("status", statusFilter);
        }

        const res = await fetch(`/api/admin/returns?${query.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to load returns");
        }
        setReturns(json.data.items || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load operations data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, warehouseFilter, statusFilter]);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Operational Handlers
  const handleApproveReturn = async (approved: boolean) => {
    if (!actionReturn) return;
    setSubmitting(true);
    try {
      const endpoint = approved
        ? `/api/admin/returns/${actionReturn.id}/approve`
        : `/api/admin/returns/${actionReturn.id}/reject`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: targetWarehouseId || undefined,
          rejectionReason: !approved ? rejectionReason : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Operation failed");
      }

      setSuccessMessage(
        approved
          ? `Return ${actionReturn.returnNumber} approved successfully.`
          : `Return ${actionReturn.returnNumber} rejected.`
      );
      setReviewModalOpen(false);
      setActionReturn(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to review return");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchedulePickup = async () => {
    if (!actionReturn) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${actionReturn.id}/schedule-pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: pickupCarrier,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to schedule pickup");
      }

      setSuccessMessage(`Pickup scheduled for ${actionReturn.returnNumber}.`);
      setSchedulePickupModalOpen(false);
      setActionReturn(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pickup booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!actionReturn) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${actionReturn.id}/confirm-pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingNumber || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to confirm pickup");
      }

      setSuccessMessage(`Pickup confirmed for ${actionReturn.returnNumber}.`);
      setConfirmPickupModalOpen(false);
      setActionReturn(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to confirm pickup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveReturn = async () => {
    if (!actionReturn || !targetWarehouseId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${actionReturn.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: targetWarehouseId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to receive return");
      }

      setSuccessMessage(`Return ${actionReturn.returnNumber} marked as received at warehouse.`);
      setReceiveModalOpen(false);
      setActionReturn(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Warehouse receipt failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartInspection = async (ret: ReturnAdminDto) => {
    try {
      const res = await fetch(`/api/admin/returns/${ret.id}/start-inspection`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to start inspection");
      }
      setSuccessMessage(`Inspection started for ${ret.returnNumber}.`);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start inspection");
    }
  };

  const openInspectionModal = (ret: ReturnAdminDto) => {
    setActionReturn(ret);
    const initialItems: Record<
      string,
      {
        result: InspectionResult;
        condition: ReturnItemCondition;
        notes: string;
        disposition: ReturnDisposition;
      }
    > = {};
    for (const item of ret.items) {
      initialItems[item.orderItemId] = {
        result: InspectionResult.PASSED,
        condition: ReturnItemCondition.OPENED_UNUSED,
        notes: "",
        disposition: ReturnDisposition.RESTOCK,
      };
    }
    setInspectionFormItems(initialItems);
    setInspectionModalOpen(true);
  };

  const handleCompleteInspection = async () => {
    if (!actionReturn) return;
    setSubmitting(true);
    try {
      const items = Object.entries(inspectionFormItems).map(([orderItemId, form]) => ({
        orderItemId,
        result: form.result,
        condition: form.condition,
        notes: form.notes,
        disposition: form.disposition,
      }));

      const res = await fetch(`/api/admin/returns/${actionReturn.id}/complete-inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to complete inspection");
      }

      setSuccessMessage(
        `Inspection finalized for ${actionReturn.returnNumber}. Restock movement triggered if passed.`
      );
      setInspectionModalOpen(false);
      setActionReturn(null);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveExchange = async (exchangeId: string) => {
    try {
      const res = await fetch(`/api/admin/exchanges/${exchangeId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Exchange approval failed");
      }
      setSuccessMessage("Exchange approved and replacement stock reserved.");
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve exchange");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification / Alerts */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 gap-6 text-xs font-mono uppercase tracking-wider">
        {[
          { key: "returns", label: "Returns Queue" },
          { key: "exchanges", label: "Size Exchanges" },
          { key: "receiving", label: "Warehouse Receiving" },
          { key: "inspection", label: "Quality Inspection" },
          { key: "disposition", label: "Restock & Disposition" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as "returns" | "exchanges" | "receiving" | "inspection" | "disposition");
              setStatusFilter("ALL");
            }}
            className={`pb-3 transition relative ${
              activeTab === tab.key
                ? "text-primary font-bold border-b-2 border-primary"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search return #, order #, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {activeTab !== "exchanges" && (
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-primary"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === "returns" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-primary font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value={ReturnStatus.REQUESTED}>REQUESTED</option>
              <option value={ReturnStatus.APPROVED}>APPROVED</option>
              <option value={ReturnStatus.PICKUP_SCHEDULED}>PICKUP_SCHEDULED</option>
              <option value={ReturnStatus.PICKED_UP}>PICKED_UP</option>
              <option value={ReturnStatus.RECEIVED}>RECEIVED</option>
              <option value={ReturnStatus.INSPECTION}>INSPECTION</option>
              <option value={ReturnStatus.APPROVED_FOR_SETTLEMENT}>APPROVED_FOR_SETTLEMENT</option>
              <option value={ReturnStatus.COMPLETED}>COMPLETED</option>
              <option value={ReturnStatus.REJECTED}>REJECTED</option>
              <option value={ReturnStatus.CANCELLED}>CANCELLED</option>
            </select>
          )}
        </div>

        <button
          onClick={() => fetchData()}
          className="px-3 py-2 text-xs font-mono uppercase bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1.5 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Main Table Content */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-neutral-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span>Loading operations ledger...</span>
          </div>
        ) : activeTab === "exchanges" ? (
          /* Exchanges Table */
          exchanges.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 font-mono">
              No size exchange requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 border-b border-neutral-800 font-mono text-neutral-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Exchange #</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Original Garment</th>
                    <th className="py-3 px-4">Requested Replacement</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {exchanges.map((exc) => (
                    <tr key={exc.id} className="hover:bg-neutral-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{exc.exchangeNumber}</td>
                      <td className="py-3 px-4 text-neutral-300">{exc.orderNumber || "—"}</td>
                      <td className="py-3 px-4">
                        <span className="text-white block font-serif truncate max-w-[180px]">
                          {exc.originalItem.productName}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {exc.originalItem.sku} • Qty {exc.originalItem.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 block font-semibold truncate max-w-[180px]">
                          {exc.replacementItem.sku}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Size {exc.replacementItem.size || "—"} • {exc.replacementItem.color || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-800 text-primary border border-primary/30">
                          {exc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {exc.status === ExchangeStatus.REQUESTED && (
                          <button
                            onClick={() => handleApproveExchange(exc.id)}
                            className="px-2.5 py-1 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-mono uppercase rounded transition"
                          >
                            Approve & Reserve
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedExchange(exc)}
                          className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-white font-mono uppercase rounded transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Returns Table */
          returns.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 font-mono">
              No returns found matching the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 border-b border-neutral-800 font-mono text-neutral-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Return #</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Facility</th>
                    <th className="py-3 px-4">Garments</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-neutral-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{ret.returnNumber}</td>
                      <td className="py-3 px-4 text-neutral-300">{ret.orderNumber || "—"}</td>
                      <td className="py-3 px-4">
                        <span className="text-white block font-serif truncate max-w-[140px]">
                          {ret.customerName || "Customer"}
                        </span>
                        <span className="text-[10px] text-neutral-400">{ret.customerEmail}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-neutral-300 font-bold block">
                          {ret.warehouseCode || "UNASSIGNED"}
                        </span>
                        <span className="text-[10px] text-neutral-500 truncate max-w-[120px] block">
                          {ret.warehouseName || "Pending Facility"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-neutral-200">
                          {ret.items.length} {ret.items.length === 1 ? "Item" : "Items"}
                        </span>
                        <span className="text-[10px] text-neutral-400 block truncate max-w-[160px]">
                          {ret.items.map((i) => `${i.sku} (×${i.quantity})`).join(", ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-800 text-neutral-200 border border-neutral-700">
                          {ret.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {ret.status === ReturnStatus.REQUESTED && (
                          <button
                            onClick={() => {
                              setActionReturn(ret);
                              setReviewModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-mono uppercase rounded transition"
                          >
                            Review
                          </button>
                        )}

                        {ret.status === ReturnStatus.APPROVED && (
                          <button
                            onClick={() => {
                              setActionReturn(ret);
                              setSchedulePickupModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-mono uppercase rounded transition"
                          >
                            Schedule Pickup
                          </button>
                        )}

                        {ret.status === ReturnStatus.PICKUP_SCHEDULED && (
                          <button
                            onClick={() => {
                              setActionReturn(ret);
                              setConfirmPickupModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-mono uppercase rounded transition"
                          >
                            Confirm Pickup
                          </button>
                        )}

                        {(ret.status === ReturnStatus.PICKED_UP || ret.status === ReturnStatus.IN_TRANSIT) && (
                          <button
                            onClick={() => {
                              setActionReturn(ret);
                              setTargetWarehouseId(ret.warehouseId || warehouses[0]?.id || "");
                              setReceiveModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] bg-purple-600 hover:bg-purple-500 text-white font-mono uppercase rounded transition"
                          >
                            Receive at Facility
                          </button>
                        )}

                        {ret.status === ReturnStatus.RECEIVED && (
                          <button
                            onClick={() => handleStartInspection(ret)}
                            className="px-2 py-1 text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-mono uppercase rounded transition"
                          >
                            Start Inspection
                          </button>
                        )}

                        {ret.status === ReturnStatus.INSPECTION && (
                          <button
                            onClick={() => openInspectionModal(ret)}
                            className="px-2 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase rounded transition"
                          >
                            QC & Restock
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedReturn(ret)}
                          className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono uppercase rounded transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Review & Approve Modal */}
      {reviewModalOpen && actionReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Review Return {actionReturn.returnNumber}</h3>
            <p className="text-xs text-neutral-400">
              Approve reverse logistics authorization or reject with clear operational notes.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-neutral-400 block">
                Assign Warehouse Facility
              </label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              >
                <option value="">Select Target Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveReturn(false)}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-mono uppercase"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleApproveReturn(true)}
                className="px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded font-mono uppercase"
              >
                Approve Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quality Inspection & Restock Modal */}
      {inspectionModalOpen && actionReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Quality Inspection (QC)</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Return {actionReturn.returnNumber} • Warehouse: {actionReturn.warehouseCode}
                </p>
              </div>
              <button onClick={() => setInspectionModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {actionReturn.items.map((item) => {
                const form = inspectionFormItems[item.orderItemId] || {
                  result: InspectionResult.PASSED,
                  condition: ReturnItemCondition.OPENED_UNUSED,
                  notes: "",
                  disposition: ReturnDisposition.RESTOCK,
                };

                return (
                  <div key={item.orderItemId} className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm text-white font-medium">{item.productName}</span>
                      <span className="text-xs font-mono text-neutral-400">
                        SKU: {item.sku} • Qty: {item.quantity}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                          Inspection Result
                        </label>
                        <select
                          value={form.result}
                          onChange={(e) => {
                            const val = e.target.value as InspectionResult;
                            setInspectionFormItems((prev) => {
                              const cur = prev[item.orderItemId] || {
                                result: InspectionResult.PASSED,
                                condition: ReturnItemCondition.OPENED_UNUSED,
                                notes: "",
                                disposition: ReturnDisposition.RESTOCK,
                              };
                              return {
                                ...prev,
                                [item.orderItemId]: { ...cur, result: val },
                              };
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white"
                        >
                          <option value={InspectionResult.PASSED}>PASSED</option>
                          <option value={InspectionResult.FAILED}>FAILED</option>
                          <option value={InspectionResult.PARTIAL}>PARTIAL</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                          Physical Condition
                        </label>
                        <select
                          value={form.condition}
                          onChange={(e) => {
                            const val = e.target.value as ReturnItemCondition;
                            setInspectionFormItems((prev) => {
                              const cur = prev[item.orderItemId] || {
                                result: InspectionResult.PASSED,
                                condition: ReturnItemCondition.OPENED_UNUSED,
                                notes: "",
                                disposition: ReturnDisposition.RESTOCK,
                              };
                              return {
                                ...prev,
                                [item.orderItemId]: { ...cur, condition: val },
                              };
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white"
                        >
                          <option value={ReturnItemCondition.OPENED_UNUSED}>OPENED_UNUSED</option>
                          <option value={ReturnItemCondition.UNOPENED}>UNOPENED</option>
                          <option value={ReturnItemCondition.WORN_OR_USED}>WORN_OR_USED</option>
                          <option value={ReturnItemCondition.DAMAGED_TAGS_MISSING}>DAMAGED_TAGS_MISSING</option>
                          <option value={ReturnItemCondition.DEFECTIVE}>DEFECTIVE</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                          Disposition
                        </label>
                        <select
                          value={form.disposition}
                          onChange={(e) => {
                            const val = e.target.value as ReturnDisposition;
                            setInspectionFormItems((prev) => {
                              const cur = prev[item.orderItemId] || {
                                result: InspectionResult.PASSED,
                                condition: ReturnItemCondition.OPENED_UNUSED,
                                notes: "",
                                disposition: ReturnDisposition.RESTOCK,
                              };
                              return {
                                ...prev,
                                [item.orderItemId]: { ...cur, disposition: val },
                              };
                            });
                          }}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white"
                        >
                          <option value={ReturnDisposition.RESTOCK}>RESTOCK (Sellable)</option>
                          <option value={ReturnDisposition.DAMAGED}>DAMAGED</option>
                          <option value={ReturnDisposition.DEFECTIVE}>DEFECTIVE</option>
                          <option value={ReturnDisposition.QUARANTINE}>QUARANTINE</option>
                          <option value={ReturnDisposition.DISPOSE}>DISPOSE</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setInspectionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteInspection}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono uppercase"
              >
                Finalize Inspection & Trigger Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Receiving Modal */}
      {receiveModalOpen && actionReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Receive Return at Warehouse</h3>
            <p className="text-xs text-neutral-400 font-mono">
              Return {actionReturn.returnNumber}
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-neutral-400 block">Receiving Facility</label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setReceiveModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReceiveReturn}
                className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded font-mono uppercase"
              >
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
