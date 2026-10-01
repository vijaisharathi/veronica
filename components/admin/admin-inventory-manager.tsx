"use client";

import * as React from "react";
import {
  Search,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
} from "lucide-react";
import { StockAdjustmentReason } from "@/constants/status";
import { InventoryItemDto, StockMovementDto, WarehouseDto } from "@/modules/inventory/types/inventory.types";

export function AdminInventoryManager() {
  const [activeTab, setActiveTab] = React.useState<"inventory" | "movements" | "reservations">("inventory");
  const [items, setItems] = React.useState<InventoryItemDto[]>([]);
  const [movements, setMovements] = React.useState<StockMovementDto[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");

  // Modals
  const [receiveModalOpen, setReceiveModalOpen] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);

  // Form states
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [receiveForm, setReceiveForm] = React.useState({
    warehouseId: "",
    variantId: "",
    quantity: 10,
    notes: "",
  });
  const [adjustForm, setAdjustForm] = React.useState<{
    warehouseId: string;
    variantId: string;
    quantityDelta: number;
    reason: StockAdjustmentReason;
    notes: string;
  }>({
    warehouseId: "",
    variantId: "",
    quantityDelta: 0,
    reason: StockAdjustmentReason.PHYSICAL_COUNT,
    notes: "",
  });

  // Load Warehouses
  React.useEffect(() => {
    async function fetchWarehouses() {
      try {
        const res = await fetch("/api/admin/warehouses");
        const json = await res.json();
        if (json.success && json.data?.warehouses) {
          setWarehouses(json.data.warehouses);
        }
      } catch (err) {
        console.error("Failed to load warehouses", err);
      }
    }
    fetchWarehouses();
  }, []);

  // Fetch Inventory
  const fetchInventory = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedWarehouseId) params.set("warehouseId", selectedWarehouseId);
      if (statusFilter === "LOW_STOCK") params.set("lowStockOnly", "true");
      if (statusFilter === "OUT_OF_STOCK") params.set("outOfStockOnly", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load inventory items");
      }
      setItems(json.data.items || []);
      setTotal(json.data.total || 0);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  }, [search, selectedWarehouseId, statusFilter]);

  // Fetch Movements
  const fetchMovements = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouseId) params.set("warehouseId", selectedWarehouseId);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/inventory/movements?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load stock movements");
      }
      setMovements(json.data.movements || []);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to fetch movements");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId]);

  React.useEffect(() => {
    if (activeTab === "inventory") {
      fetchInventory();
    } else if (activeTab === "movements") {
      fetchMovements();
    }
  }, [activeTab, fetchInventory, fetchMovements]);

  // Handle Receive Stock Submit
  async function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: receiveForm.warehouseId,
          variantId: receiveForm.variantId,
          quantity: Number(receiveForm.quantity),
          notes: receiveForm.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to receive stock");
      }

      setSuccessMessage("Stock successfully received and on-hand inventory updated.");
      setReceiveModalOpen(false);
      setReceiveForm({ warehouseId: "", variantId: "", quantity: 10, notes: "" });
      fetchInventory();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to submit receiving");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Adjust Stock Submit
  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: adjustForm.warehouseId,
          variantId: adjustForm.variantId,
          quantityDelta: Number(adjustForm.quantityDelta),
          reason: adjustForm.reason,
          notes: adjustForm.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to adjust stock");
      }

      setSuccessMessage("Stock adjustment successfully applied and movement recorded.");
      setAdjustModalOpen(false);
      setAdjustForm({
        warehouseId: "",
        variantId: "",
        quantityDelta: 0,
        reason: StockAdjustmentReason.PHYSICAL_COUNT,
        notes: "",
      });
      fetchInventory();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to submit adjustment");
    } finally {
      setSubmitting(false);
    }
  }

  // Metrics
  const inStockCount = items.filter((i) => i.status === "IN_STOCK").length;
  const lowStockCount = items.filter((i) => i.status === "LOW_STOCK").length;
  const outOfStockCount = items.filter((i) => i.status === "OUT_OF_STOCK").length;
  const totalOnHand = items.reduce((acc, i) => acc + (i.quantityOnHand || 0), 0);
  const totalReserved = items.reduce((acc, i) => acc + (i.quantityReserved || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-neutral-900">
            Inventory & Warehouse Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Authoritative variant-level stock tracking, warehouse allocation, and auditable movement logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setReceiveForm({
                warehouseId: warehouses[0]?.id || "",
                variantId: "",
                quantity: 10,
                notes: "",
              });
              setReceiveModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-widest font-medium rounded-md hover:bg-neutral-800 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Receive Stock
          </button>
          <button
            onClick={() => {
              if (activeTab === "inventory") fetchInventory();
              else fetchMovements();
            }}
            className="p-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 transition text-neutral-700"
            title="Refresh inventory data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success alert banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Tracked Records</span>
          <div className="text-2xl font-serif font-bold text-neutral-900 mt-1">{total}</div>
          <span className="text-[11px] text-neutral-400">Variant-warehouse units</span>
        </div>
        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Total On Hand</span>
          <div className="text-2xl font-serif font-bold text-neutral-900 mt-1">{totalOnHand}</div>
          <span className="text-[11px] text-neutral-400">{totalReserved} reserved</span>
        </div>
        <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-lg shadow-sm">
          <span className="text-xs uppercase tracking-wider text-emerald-700 font-medium">In Stock</span>
          <div className="text-2xl font-serif font-bold text-emerald-900 mt-1">{inStockCount}</div>
          <span className="text-[11px] text-emerald-600">Available to purchase</span>
        </div>
        <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-lg shadow-sm">
          <span className="text-xs uppercase tracking-wider text-amber-700 font-medium">Low Stock</span>
          <div className="text-2xl font-serif font-bold text-amber-900 mt-1">{lowStockCount}</div>
          <span className="text-[11px] text-amber-600">At or below reorder level</span>
        </div>
        <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-lg shadow-sm">
          <span className="text-xs uppercase tracking-wider text-rose-700 font-medium">Out of Stock</span>
          <div className="text-2xl font-serif font-bold text-rose-900 mt-1">{outOfStockCount}</div>
          <span className="text-[11px] text-rose-600">0 available units</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 flex gap-8">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 text-sm font-medium tracking-wide uppercase transition border-b-2 ${
            activeTab === "inventory"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Warehouse Stock
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 text-sm font-medium tracking-wide uppercase transition border-b-2 ${
            activeTab === "movements"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Stock Movement Audit
        </button>
      </div>

      {/* Tab 1: Live Inventory */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU or variant..."
                className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            {/* Warehouse Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Building2 className="w-4 h-4 text-neutral-500" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="border border-neutral-300 rounded-md px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900 w-full md:w-auto"
              >
                <option value="">All Fulfillment Centers</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.code} — {wh.name} ({wh.address.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition ${
                    statusFilter === status
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {status.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-neutral-400">Loading inventory data...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600 flex flex-col items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                <span>{error}</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-neutral-400">No inventory records found matching filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Product & Variant</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-center">On Hand</th>
                      <th className="py-3 px-4 text-center">Reserved</th>
                      <th className="py-3 px-4 text-center">Available</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-3.5 px-4 font-medium text-neutral-900">
                          <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 rounded mr-2">
                            {item.warehouseCode}
                          </span>
                          <span className="text-xs text-neutral-500">{item.warehouseName}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-neutral-900">{item.productName || "Garment"}</div>
                          <div className="text-xs text-neutral-500">
                            {item.color} / {item.size}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">{item.sku}</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-neutral-900">
                          {item.quantityOnHand}
                        </td>
                        <td className="py-3.5 px-4 text-center text-neutral-500">
                          {item.quantityReserved}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-neutral-900">
                          {item.availableQuantity}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === "IN_STOCK" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> In Stock
                            </span>
                          )}
                          {item.status === "LOW_STOCK" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Low Stock
                            </span>
                          )}
                          {item.status === "OUT_OF_STOCK" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setAdjustForm({
                                warehouseId: item.warehouseId,
                                variantId: item.variantId,
                                quantityDelta: 0,
                                reason: StockAdjustmentReason.PHYSICAL_COUNT,
                                notes: "",
                              });
                              setAdjustModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs border border-neutral-300 rounded hover:bg-neutral-100 text-neutral-700 transition"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => {
                              setReceiveForm({
                                warehouseId: item.warehouseId,
                                variantId: item.variantId,
                                quantity: 10,
                                notes: "",
                              });
                              setReceiveModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-800 transition"
                          >
                            Receive
                          </button>
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

      {/* Tab 2: Stock Movement Audit */}
      {activeTab === "movements" && (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-neutral-400">Loading audit history...</div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">No stock movements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">SKU / Variant</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4 text-center">Before → After</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/50 transition">
                      <td className="py-3 px-4 text-xs font-mono text-neutral-500">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{m.warehouseCode}</td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-900">{m.sku}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs font-medium rounded uppercase bg-neutral-100 text-neutral-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{m.quantity}</td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-neutral-500">
                        {m.beforeQuantity} → {m.afterQuantity}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600">
                        {m.reason || (m.adjustmentReason ? `Reason: ${m.adjustmentReason}` : "—")}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-500">{m.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Receive Stock Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <h2 className="font-serif text-xl font-semibold text-neutral-900 mb-1">Receive Inbound Stock</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Add verified physical inventory intake to warehouse stock.
            </p>

            {formError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Warehouse
                </label>
                <select
                  value={receiveForm.warehouseId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, warehouseId: e.target.value })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.code} — {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Variant ID
                </label>
                <input
                  type="text"
                  value={receiveForm.variantId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, variantId: e.target.value })}
                  placeholder="e.g. 507f1f77bcf86cd799439011"
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Quantity Received
                </label>
                <input
                  type="number"
                  min="1"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm({ ...receiveForm, quantity: Number(e.target.value) })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Receiving Notes (Optional)
                </label>
                <textarea
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="PO number, supplier batch reference, or condition notes..."
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? "Receiving..." : "Confirm Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <h2 className="font-serif text-xl font-semibold text-neutral-900 mb-1">Adjust Inventory Level</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Authorized manual adjustment with structured reason audit.
            </p>

            {formError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Quantity Delta (Positive to add, Negative to deduct)
                </label>
                <input
                  type="number"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: Number(e.target.value) })}
                  placeholder="e.g. -3 or 5"
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
                <span className="text-[11px] text-neutral-500">
                  Example: Physical count was 47 vs system 50 → enter -3
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Adjustment Reason
                </label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value as StockAdjustmentReason })}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                >
                  {Object.values(StockAdjustmentReason).map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Audit Notes
                </label>
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="Reasoning, recount supervisor, or condition..."
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? "Applying..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
