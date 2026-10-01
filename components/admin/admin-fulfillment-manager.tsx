"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  Truck,
  Box,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  X,
  ExternalLink,
} from "lucide-react";
import { FulfillmentStatus, ShipmentStatus } from "@/constants/status";
import {
  FulfillmentDTO,
  ShipmentDTO,
  PackageDTO,
} from "@/modules/fulfillment/types/fulfillment.types";
import { WarehouseDto } from "@/modules/inventory/types/inventory.types";

export function AdminFulfillmentManager() {
  const [activeTab, setActiveTab] = React.useState<"fulfillments" | "shipments">("fulfillments");
  const [fulfillments, setFulfillments] = React.useState<FulfillmentDTO[]>([]);
  const [shipments, setShipments] = React.useState<ShipmentDTO[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [stats, setStats] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Detail Modal
  const [selectedFulfillment, setSelectedFulfillment] = React.useState<FulfillmentDTO | null>(null);
  const [fulfillmentPackages, setFulfillmentPackages] = React.useState<PackageDTO[]>([]);
  const [fulfillmentShipments, setFulfillmentShipments] = React.useState<ShipmentDTO[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Operation Modals
  const [packageModalOpen, setPackageModalOpen] = React.useState(false);
  const [shipmentModalOpen, setShipmentModalOpen] = React.useState(false);
  const [actionFulfillment, setActionFulfillment] = React.useState<FulfillmentDTO | null>(null);

  // Form states
  const [submitting, setSubmitting] = React.useState(false);
  const [packageForm, setPackageForm] = React.useState({
    weightGrams: 500,
    lengthMm: 300,
    widthMm: 200,
    heightMm: 50,
  });
  const [shipmentForm, setShipmentForm] = React.useState({
    packageId: "",
    serviceLevel: "STANDARD",
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

  // Fetch Fulfillments
  const fetchFulfillments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (warehouseFilter) params.set("warehouseId", warehouseFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/fulfillment?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setFulfillments(json.data.items || []);
        setStats(json.data.stats || {});
      } else {
        setError(json.error?.message || "Failed to load fulfillments");
      }
    } catch {
      setError("An unexpected error occurred while loading fulfillments");
    } finally {
      setLoading(false);
    }
  }, [search, warehouseFilter, statusFilter]);

  // Fetch Shipments
  const fetchShipments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (warehouseFilter) params.set("warehouseId", warehouseFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/shipments?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setShipments(json.data.items || []);
      } else {
        setError(json.error?.message || "Failed to load shipments");
      }
    } catch {
      setError("An unexpected error occurred while loading shipments");
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, statusFilter]);

  React.useEffect(() => {
    if (activeTab === "fulfillments") {
      fetchFulfillments();
    } else {
      fetchShipments();
    }
  }, [activeTab, fetchFulfillments, fetchShipments]);

  // View Fulfillment Details
  const handleViewDetails = async (f: FulfillmentDTO) => {
    setSelectedFulfillment(f);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/fulfillment/${f.id}`);
      const json = await res.json();
      if (json.success) {
        setFulfillmentPackages(json.data.packages || []);
        setFulfillmentShipments(json.data.shipments || []);
      }
    } catch {
      console.error("Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Status transition handlers
  const handleStartPicking = async (fulfillmentId: string) => {
    try {
      const res = await fetch(`/api/admin/fulfillment/${fulfillmentId}/start-picking`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Picking phase started");
        fetchFulfillments();
      } else {
        setError(json.error?.message || "Failed to start picking");
      }
    } catch {
      setError("Network error starting picking");
    }
  };

  const handleConfirmPick = async (f: FulfillmentDTO) => {
    try {
      const pickedItems = f.items.map((i) => ({
        orderItemId: i.orderItemId,
        quantity: i.orderedQuantity,
      }));
      const res = await fetch(`/api/admin/fulfillment/${f.id}/confirm-pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickedItems }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Items picked successfully");
        fetchFulfillments();
      } else {
        setError(json.error?.message || "Failed to confirm picking");
      }
    } catch {
      setError("Network error confirming pick");
    }
  };

  const handleStartPacking = async (fulfillmentId: string) => {
    try {
      const res = await fetch(`/api/admin/fulfillment/${fulfillmentId}/start-packing`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Packing phase started");
        fetchFulfillments();
      } else {
        setError(json.error?.message || "Failed to start packing");
      }
    } catch {
      setError("Network error starting packing");
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionFulfillment) return;

    setSubmitting(true);
    try {
      const items = actionFulfillment.items.map((i) => ({
        orderItemId: i.orderItemId,
        variantId: i.variantId,
        sku: i.sku,
        quantity: i.orderedQuantity,
      }));

      const res = await fetch(`/api/admin/fulfillment/${actionFulfillment.id}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          weightGrams: Number(packageForm.weightGrams),
          lengthMm: Number(packageForm.lengthMm),
          widthMm: Number(packageForm.widthMm),
          heightMm: Number(packageForm.heightMm),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Package created successfully");
        setPackageModalOpen(false);
        fetchFulfillments();
      } else {
        setError(json.error?.message || "Failed to create package");
      }
    } catch {
      setError("Network error creating package");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPack = async (fulfillmentId: string) => {
    try {
      const res = await fetch(`/api/admin/fulfillment/${fulfillmentId}/confirm-pack`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Packing confirmed and order state synchronized");
        fetchFulfillments();
      } else {
        setError(json.error?.message || "Failed to confirm packing");
      }
    } catch {
      setError("Network error confirming packing");
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionFulfillment || !shipmentForm.packageId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/fulfillment/${actionFulfillment.id}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: shipmentForm.packageId,
          serviceLevel: shipmentForm.serviceLevel,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Shipment created: ${json.data.shipment.shipmentNumber}`);
        setShipmentModalOpen(false);
        fetchFulfillments();
      } else {
        setError(json.error?.message || "Failed to create shipment");
      }
    } catch {
      setError("Network error creating shipment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (shipmentId: string) => {
    try {
      const res = await fetch(`/api/admin/shipments/${shipmentId}/reconcile`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(json.data.message);
        fetchShipments();
      } else {
        setError(json.error?.message || "Reconciliation failed");
      }
    } catch {
      setError("Network error during reconciliation");
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case FulfillmentStatus.READY_FOR_FULFILLMENT:
      case FulfillmentStatus.ALLOCATED:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case FulfillmentStatus.PICKING:
      case FulfillmentStatus.PICKED:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case FulfillmentStatus.PACKING:
      case FulfillmentStatus.PACKED:
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case FulfillmentStatus.SHIPMENT_CREATED:
      case ShipmentStatus.IN_TRANSIT:
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case FulfillmentStatus.COMPLETED:
      case ShipmentStatus.DELIVERED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case FulfillmentStatus.CANCELLED:
      case ShipmentStatus.CANCELLED:
      case ShipmentStatus.FAILED:
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-neutral-800 text-neutral-300 border-neutral-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">Allocated / Ready</p>
            <p className="text-2xl font-bold text-white">
              {(stats[FulfillmentStatus.ALLOCATED] || 0) +
                (stats[FulfillmentStatus.READY_FOR_FULFILLMENT] || 0)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">Pick & Pack</p>
            <p className="text-2xl font-bold text-white">
              {(stats[FulfillmentStatus.PICKING] || 0) +
                (stats[FulfillmentStatus.PICKED] || 0) +
                (stats[FulfillmentStatus.PACKING] || 0) +
                (stats[FulfillmentStatus.PACKED] || 0)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">Shipments Created</p>
            <p className="text-2xl font-bold text-white">
              {stats[FulfillmentStatus.SHIPMENT_CREATED] || 0}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">Completed Deliveries</p>
            <p className="text-2xl font-bold text-white">
              {stats[FulfillmentStatus.COMPLETED] || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => {
            setActiveTab("fulfillments");
            setStatusFilter("ALL");
          }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === "fulfillments"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Fulfillment Orders</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("shipments");
            setStatusFilter("ALL");
          }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === "shipments"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-neutral-400 hover:text-white"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Shipments & AWB Tracking</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div className="flex flex-1 items-center space-x-3 w-full md:w-auto">
          {activeTab === "fulfillments" && (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search fulfillment #, order, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Warehouse Selector */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Statuses</option>
            {activeTab === "fulfillments" ? (
              <>
                <option value={FulfillmentStatus.ALLOCATED}>Allocated</option>
                <option value={FulfillmentStatus.PICKING}>Picking</option>
                <option value={FulfillmentStatus.PICKED}>Picked</option>
                <option value={FulfillmentStatus.PACKING}>Packing</option>
                <option value={FulfillmentStatus.PACKED}>Packed</option>
                <option value={FulfillmentStatus.SHIPMENT_CREATED}>Shipment Created</option>
                <option value={FulfillmentStatus.COMPLETED}>Completed</option>
                <option value={FulfillmentStatus.CANCELLED}>Cancelled</option>
              </>
            ) : (
              <>
                <option value={ShipmentStatus.CREATED}>Created</option>
                <option value={ShipmentStatus.LABEL_CREATED}>Label Created</option>
                <option value={ShipmentStatus.READY_FOR_PICKUP}>Ready for Pickup</option>
                <option value={ShipmentStatus.PICKED_UP}>Picked Up</option>
                <option value={ShipmentStatus.IN_TRANSIT}>In Transit</option>
                <option value={ShipmentStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                <option value={ShipmentStatus.DELIVERED}>Delivered</option>
                <option value={ShipmentStatus.FAILED}>Failed</option>
                <option value={ShipmentStatus.CANCELLED}>Cancelled</option>
              </>
            )}
          </select>
        </div>

        <button
          onClick={() => (activeTab === "fulfillments" ? fetchFulfillments() : fetchShipments())}
          className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg border border-neutral-700 transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Content Tables */}
      {activeTab === "fulfillments" ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/50 text-neutral-400 text-xs font-semibold uppercase">
                  <th className="py-3 px-4">Fulfillment #</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {loading && fulfillments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      Loading fulfillment orders...
                    </td>
                  </tr>
                ) : fulfillments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      No fulfillment records found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  fulfillments.map((f) => (
                    <tr key={f.id} className="hover:bg-neutral-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {f.fulfillmentNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400 text-xs">
                        {f.orderId.substring(0, 10)}...
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        <span className="flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{f.warehouseCode || f.warehouseId.substring(0, 8)}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        {f.items.map((i) => (
                          <div key={i.orderItemId} className="text-xs">
                            {i.productName} ({i.size}) × {i.orderedQuantity}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                            f.status
                          )}`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {f.status === FulfillmentStatus.ALLOCATED && (
                          <button
                            onClick={() => handleStartPicking(f.id)}
                            className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 text-xs font-medium"
                          >
                            Start Pick
                          </button>
                        )}
                        {f.status === FulfillmentStatus.PICKING && (
                          <button
                            onClick={() => handleConfirmPick(f)}
                            className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-600/30 text-xs font-medium"
                          >
                            Confirm Pick
                          </button>
                        )}
                        {f.status === FulfillmentStatus.PICKED && (
                          <button
                            onClick={() => handleStartPacking(f.id)}
                            className="px-2.5 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600/30 text-xs font-medium"
                          >
                            Start Pack
                          </button>
                        )}
                        {(f.status === FulfillmentStatus.PACKING ||
                          f.status === FulfillmentStatus.PICKED) && (
                          <button
                            onClick={() => {
                              setActionFulfillment(f);
                              setPackageModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-600/30 text-xs font-medium"
                          >
                            + Package
                          </button>
                        )}
                        {f.status === FulfillmentStatus.PACKING && (
                          <button
                            onClick={() => handleConfirmPack(f.id)}
                            className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-600/30 text-xs font-medium"
                          >
                            Finish Pack
                          </button>
                        )}
                        {f.status === FulfillmentStatus.PACKED && (
                          <button
                            onClick={async () => {
                              setActionFulfillment(f);
                              // fetch packages for this fulfillment
                              const res = await fetch(`/api/admin/fulfillment/${f.id}/packages`);
                              const json = await res.json();
                              if (json.success && json.data.packages?.length > 0) {
                                setFulfillmentPackages(json.data.packages);
                                setShipmentForm((prev) => ({
                                  ...prev,
                                  packageId: json.data.packages[0].id,
                                }));
                                setShipmentModalOpen(true);
                              } else {
                                setError("No packages available for shipment");
                              }
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-600/30 text-xs font-medium"
                          >
                            Create Shipment
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(f)}
                          className="px-2.5 py-1 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded hover:bg-neutral-700 text-xs font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Shipments Table */
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/50 text-neutral-400 text-xs font-semibold uppercase">
                  <th className="py-3 px-4">Shipment #</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">AWB Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {loading && shipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      Loading shipments...
                    </td>
                  </tr>
                ) : shipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      No shipments found.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {s.shipmentNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400 text-xs">
                        {s.orderId.substring(0, 10)}...
                      </td>
                      <td className="py-3 px-4 text-neutral-300 font-medium">
                        {s.provider}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 text-xs">
                        {s.awbNumber ? (
                          s.trackingUrl ? (
                            <a
                              href={s.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline flex items-center space-x-1"
                            >
                              <span>{s.awbNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            s.awbNumber
                          )
                        ) : (
                          <span className="text-neutral-500 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                            s.status
                          )}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {s.awbNumber && s.status !== ShipmentStatus.DELIVERED && (
                          <button
                            onClick={() => handleReconcile(s.id)}
                            className="px-2.5 py-1 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-600/30 text-xs font-medium"
                          >
                            Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedFulfillment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Fulfillment {selectedFulfillment.fulfillmentNumber}
                </h3>
                <p className="text-xs text-neutral-400">Order {selectedFulfillment.orderId}</p>
              </div>
              <button
                onClick={() => setSelectedFulfillment(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <p className="text-neutral-500 text-sm">Loading details...</p>
            ) : (
              <div className="space-y-6 text-sm">
                <div>
                  <h4 className="text-xs uppercase font-semibold text-neutral-400 tracking-wider mb-2">
                    Fulfillment Items
                  </h4>
                  <div className="bg-neutral-950 rounded-lg p-3 divide-y divide-neutral-800">
                    {selectedFulfillment.items.map((i) => (
                      <div key={i.orderItemId} className="py-2 flex justify-between">
                        <div>
                          <p className="font-medium text-white">{i.productName}</p>
                          <p className="text-xs text-neutral-500">
                            SKU: {i.sku} | Size: {i.size} | Color: {i.color}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-neutral-300">
                            {i.fulfilledQuantity} / {i.orderedQuantity} Fulfilled
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-semibold text-neutral-400 tracking-wider mb-2">
                    Packages ({fulfillmentPackages.length})
                  </h4>
                  {fulfillmentPackages.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No packages created yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {fulfillmentPackages.map((p) => (
                        <div
                          key={p.id}
                          className="bg-neutral-950 p-3 rounded-lg flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-mono text-white font-medium">
                              {p.packageNumber}
                            </span>
                            <span className="text-neutral-500 ml-2">({p.weightGrams}g)</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs uppercase font-semibold text-neutral-400 tracking-wider mb-2">
                    Shipments ({fulfillmentShipments.length})
                  </h4>
                  {fulfillmentShipments.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No shipments created yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {fulfillmentShipments.map((s) => (
                        <div
                          key={s.id}
                          className="bg-neutral-950 p-3 rounded-lg flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-mono text-white font-medium">
                              {s.shipmentNumber}
                            </span>
                            <span className="text-amber-400 ml-2 font-mono">
                              AWB: {s.awbNumber || "N/A"}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs border ${getStatusBadge(
                              s.status
                            )}`}
                          >
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Package Modal */}
      {packageModalOpen && actionFulfillment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePackage}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">
                Create Package ({actionFulfillment.fulfillmentNumber})
              </h3>
              <button
                type="button"
                onClick={() => setPackageModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-neutral-400 text-xs mb-1">Weight (grams)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packageForm.weightGrams}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, weightGrams: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-neutral-400 text-xs mb-1">Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    value={packageForm.lengthMm}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, lengthMm: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-xs mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="1"
                    value={packageForm.widthMm}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, widthMm: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-xs mb-1">Height (mm)</label>
                  <input
                    type="number"
                    min="1"
                    value={packageForm.heightMm}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, heightMm: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPackageModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Confirm Package"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Shipment Modal */}
      {shipmentModalOpen && actionFulfillment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateShipment}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Create Carrier Shipment</h3>
              <button
                type="button"
                onClick={() => setShipmentModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-neutral-400 text-xs mb-1">Package</label>
                <select
                  required
                  value={shipmentForm.packageId}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, packageId: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono text-xs"
                >
                  {fulfillmentPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.packageNumber} ({pkg.weightGrams}g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 text-xs mb-1">Service Level</label>
                <select
                  value={shipmentForm.serviceLevel}
                  onChange={(e) =>
                    setShipmentForm({ ...shipmentForm, serviceLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                >
                  <option value="STANDARD">Standard Ground</option>
                  <option value="EXPRESS">Express Priority</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShipmentModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-neutral-950 font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {submitting ? "Booking Carrier..." : "Book Shipment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
