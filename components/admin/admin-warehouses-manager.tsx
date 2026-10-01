"use client";

import * as React from "react";
import {
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  User,
  MapPin,
  Edit2,
} from "lucide-react";
import { WarehouseStatus } from "@/constants/status";
import { WarehouseDto } from "@/modules/inventory/types/inventory.types";

export function AdminWarehousesManager() {
  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [createForm, setCreateForm] = React.useState({
    code: "",
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    phone: "",
    email: "",
    contactPerson: "",
    status: WarehouseStatus.ACTIVE,
  });

  // Edit Status Modal
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingWh, setEditingWh] = React.useState<WarehouseDto | null>(null);
  const [editStatus, setEditStatus] = React.useState<WarehouseStatus>(WarehouseStatus.ACTIVE);

  const fetchWarehouses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/warehouses?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load warehouses");
      }
      setWarehouses(json.data?.warehouses || []);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to fetch warehouses");
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        code: createForm.code.toUpperCase().trim(),
        name: createForm.name.trim(),
        address: {
          addressLine1: createForm.addressLine1.trim(),
          addressLine2: createForm.addressLine2.trim() || undefined,
          city: createForm.city.trim(),
          state: createForm.state.trim(),
          country: createForm.country.trim(),
          pincode: createForm.pincode.trim(),
        },
        contact: {
          phone: createForm.phone.trim(),
          email: createForm.email.toLowerCase().trim(),
          contactPerson: createForm.contactPerson.trim(),
        },
        status: createForm.status,
      };

      const res = await fetch("/api/admin/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create warehouse");
      }

      setSuccessMessage(`Warehouse ${payload.code} successfully created.`);
      setCreateModalOpen(false);
      setCreateForm({
        code: "",
        name: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        phone: "",
        email: "",
        contactPerson: "",
        status: WarehouseStatus.ACTIVE,
      });
      fetchWarehouses();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to create warehouse");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWh) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/warehouses/${editingWh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update warehouse status");
      }

      setSuccessMessage(`Warehouse ${editingWh.code} status updated to ${editStatus}.`);
      setEditModalOpen(false);
      setEditingWh(null);
      fetchWarehouses();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-wide text-neutral-900">
            Fulfillment Centers & Warehouses
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Configure regional fulfillment facilities, status availability, and operational centers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white text-xs uppercase tracking-widest font-medium rounded-md hover:bg-neutral-800 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Add Warehouse
          </button>
          <button
            onClick={fetchWarehouses}
            className="p-2.5 border border-neutral-300 rounded-md hover:bg-neutral-100 transition text-neutral-700"
            title="Refresh warehouses"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search warehouse code or city..."
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">Loading fulfillment centers...</div>
      ) : error ? (
        <div className="p-8 text-center text-rose-600 flex flex-col items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 bg-white border border-neutral-200 rounded-lg">
          No warehouses found matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm hover:shadow transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 font-bold">
                      {wh.code}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-neutral-900 mt-1">{wh.name}</h3>
                  </div>
                  <div>
                    {wh.status === "ACTIVE" && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    )}
                    {wh.status === "INACTIVE" && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">
                        Inactive
                      </span>
                    )}
                    {wh.status === "MAINTENANCE" && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                        Maintenance
                      </span>
                    )}
                    {wh.status === "ARCHIVED" && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800">
                        Archived
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 mb-6">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <span>
                      {wh.address.addressLine1}, {wh.address.city}, {wh.address.state} - {wh.address.pincode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{wh.contact.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{wh.contact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{wh.contact.email}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4 flex justify-between items-center">
                <span className="text-[11px] text-neutral-400">Status: {wh.operatingStatus}</span>
                <button
                  onClick={() => {
                    setEditingWh(wh);
                    setEditStatus(wh.status);
                    setEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-300 rounded hover:bg-neutral-50 text-neutral-700 transition"
                >
                  <Edit2 className="w-3 h-3" /> Change Status
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Warehouse Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif text-xl font-semibold text-neutral-900 mb-1">Add Fulfillment Facility</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Register a new operational warehouse center for inventory fulfillment.
            </p>

            {formError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Warehouse Code (Unique)
                  </label>
                  <input
                    type="text"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    placeholder="e.g. DEL-01"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Delhi NCR Hub"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={createForm.addressLine1}
                  onChange={(e) => setCreateForm({ ...createForm, addressLine1: e.target.value })}
                  placeholder="Street and building number"
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                    placeholder="State"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={createForm.pincode}
                    onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })}
                    placeholder="6 digits"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={createForm.contactPerson}
                    onChange={(e) => setCreateForm({ ...createForm, contactPerson: e.target.value })}
                    placeholder="Manager name"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="10 digits"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="wh@verona.com"
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Register Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editModalOpen && editingWh && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl border border-neutral-200">
            <h2 className="font-serif text-lg font-semibold text-neutral-900 mb-1">
              Update Status: {editingWh.code}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">{editingWh.name}</p>

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as WarehouseStatus)}
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  {Object.values(WarehouseStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
