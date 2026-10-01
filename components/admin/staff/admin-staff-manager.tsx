"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  UserPlus,
  Shield,
  ShieldAlert,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
} from "lucide-react";
import { StaffStatus } from "@/constants/status";
import {
  AdminStaffListItemDTO,
  AdminStaffDetailDTO,
  AdminRoleDTO,
} from "@/modules/admin/types/admin-management.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminStaffManager() {
  const [staffList, setStaffList] = React.useState<AdminStaffListItemDTO[]>([]);
  const [roles, setRoles] = React.useState<AdminRoleDTO[]>([]);
  const [warehouses, setWarehouses] = React.useState<Array<{ code: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [roleFilter, setRoleFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 20;

  // Modals state
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedStaffDetail, setSelectedStaffDetail] = React.useState<AdminStaffDetailDTO | null>(null);
  const [roleModalStaff, setRoleModalStaff] = React.useState<AdminStaffListItemDTO | null>(null);
  const [scopeModalStaff, setScopeModalStaff] = React.useState<AdminStaffListItemDTO | null>(null);
  const [statusModalStaff, setStatusModalStaff] = React.useState<AdminStaffListItemDTO | null>(null);

  // Form states
  const [newStaff, setNewStaff] = React.useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    roles: [] as string[],
    assignedWarehouseId: "",
  });
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
  const [selectedScope, setSelectedScope] = React.useState<string>("");
  const [statusReason, setStatusReason] = React.useState("");
  const [actionInProgress, setActionInProgress] = React.useState(false);

  const fetchStaff = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/staff?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load staff list");
      }

      setStaffList(json.data.data);
      setTotal(json.data.pagination.total);
      setTotalPages(json.data.pagination.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, roleFilter, search]);

  const fetchAuxiliary = React.useCallback(async () => {
    try {
      const [roleRes, whRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/warehouses"),
      ]);

      if (roleRes.ok) {
        const rJson = await roleRes.json();
        if (rJson.success) setRoles(rJson.data);
      }
      if (whRes.ok) {
        const wJson = await whRes.json();
        if (wJson.success && Array.isArray(wJson.data)) {
          setWarehouses(wJson.data.map((w: { code: string; name: string }) => ({ code: w.code, name: w.name })));
        }
      }
    } catch {
      // Non-critical auxiliary fetch
    }
  }, []);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  React.useEffect(() => {
    fetchAuxiliary();
  }, [fetchAuxiliary]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionInProgress(true);
      setError(null);

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newStaff,
          assignedWarehouseId: newStaff.assignedWarehouseId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create staff account");
      }

      setSuccessMessage(`Staff member ${newStaff.email} created successfully`);
      setCreateModalOpen(false);
      setNewStaff({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        roles: [],
        assignedWarehouseId: "",
      });
      fetchStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to onboard staff");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!roleModalStaff) return;
    try {
      setActionInProgress(true);
      setError(null);

      const res = await fetch(`/api/admin/staff/${roleModalStaff.id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selectedRoles }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update roles");
      }

      setSuccessMessage(`Roles updated for ${roleModalStaff.email}`);
      setRoleModalStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Role mutation failed");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUpdateScope = async () => {
    if (!scopeModalStaff) return;
    try {
      setActionInProgress(true);
      setError(null);

      const res = await fetch(`/api/admin/staff/${scopeModalStaff.id}/scope`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedWarehouseId: selectedScope || null }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update warehouse scope");
      }

      setSuccessMessage(`Warehouse scope updated for ${scopeModalStaff.email}`);
      setScopeModalStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scope update failed");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModalStaff) return;
    try {
      setActionInProgress(true);
      setError(null);

      const isSuspended = statusModalStaff.status === StaffStatus.SUSPENDED;
      const endpoint = isSuspended
        ? `/api/admin/staff/${statusModalStaff.id}/restore`
        : `/api/admin/staff/${statusModalStaff.id}/suspend`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: statusReason.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to transition staff status");
      }

      setSuccessMessage(
        `Staff member ${statusModalStaff.email} ${
          isSuspended ? "restored to ACTIVE" : "SUSPENDED"
        }`
      );
      setStatusModalStaff(null);
      setStatusReason("");
      fetchStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status transition failed");
    } finally {
      setActionInProgress(false);
    }
  };

  const inspectStaff = async (staffId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/staff/${staffId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to retrieve staff details");
      }
      setSelectedStaffDetail(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Inspect failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Total Staff
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-foreground">{total}</p>
          </div>
          <Shield className="h-8 w-8 text-primary/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Active Staff
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-emerald-600 dark:text-emerald-400">
              {staffList.filter((s) => s.status === StaffStatus.ACTIVE).length}
            </p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Suspended Staff
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-rose-600 dark:text-rose-400">
              {staffList.filter((s) => s.status === StaffStatus.SUSPENDED).length}
            </p>
          </div>
          <XCircle className="h-8 w-8 text-rose-500/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Roles Registered
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-foreground">{roles.length}</p>
          </div>
          <Key className="h-8 w-8 text-primary/40" />
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-sm text-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto h-7 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="ml-auto h-7 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-card border border-border rounded-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search staff by name, email, or phone..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={StaffStatus.ACTIVE}>Active</option>
            <option value={StaffStatus.SUSPENDED}>Suspended</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStaff()}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Onboard Staff
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Assigned Roles</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Warehouse Scope</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading workforce directory...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No staff records match the current filter.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{s.email}</div>
                      {s.phone && (
                        <div className="text-[11px] text-muted-foreground font-mono">{s.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant="secondary"
                            className="text-[11px] font-mono font-normal"
                          >
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {s.status === StaffStatus.ACTIVE ? (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-xs">
                          Suspended
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.assignedWarehouseId ? (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span>{s.warehouse?.name || s.assignedWarehouseId}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">
                          Global Access
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => inspectStaff(s.id)}
                          className="h-8 px-2 text-xs"
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoleModalStaff(s);
                            setSelectedRoles(s.roles.map((r) => r.slug));
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          Roles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setScopeModalStaff(s);
                            setSelectedScope(s.assignedWarehouseId || "");
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          Scope
                        </Button>
                        {s.status === StaffStatus.ACTIVE ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStatusModalStaff(s);
                              setStatusReason("");
                            }}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs"
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStatusModalStaff(s);
                              setStatusReason("");
                            }}
                            className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs"
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div>
            Showing {staffList.length} of {total} staff accounts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 text-xs"
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Onboard Staff Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-serif font-medium text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Onboard New Staff Member
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono uppercase text-muted-foreground">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                    className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono uppercase text-muted-foreground">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                    className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-muted-foreground">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="staff@verona.com"
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-muted-foreground">Phone</label>
                <input
                  type="text"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-muted-foreground">Assign Roles *</label>
                <div className="grid grid-cols-2 gap-2 p-2.5 border border-border rounded-sm bg-background max-h-36 overflow-y-auto">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStaff.roles.includes(r.slug)}
                        onChange={(e) => {
                          const current = newStaff.roles;
                          if (e.target.checked) {
                            setNewStaff({ ...newStaff, roles: [...current, r.slug] });
                          } else {
                            setNewStaff({ ...newStaff, roles: current.filter((x) => x !== r.slug) });
                          }
                        }}
                        className="rounded-xs text-primary"
                      />
                      <span className="font-medium text-foreground">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono uppercase text-muted-foreground">
                  Warehouse Scope (Optional)
                </label>
                <select
                  value={newStaff.assignedWarehouseId}
                  onChange={(e) => setNewStaff({ ...newStaff, assignedWarehouseId: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Global (Unrestricted to Single Warehouse)</option>
                  {warehouses.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionInProgress || newStaff.roles.length === 0}
                  className="gap-1.5"
                >
                  {actionInProgress && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Complete Onboarding
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Staff Detail Drawer */}
      {selectedStaffDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  {selectedStaffDetail.firstName} {selectedStaffDetail.lastName}
                </h3>
                <p className="text-xs font-mono text-muted-foreground">{selectedStaffDetail.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStaffDetail(null)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-mono uppercase text-muted-foreground mb-1.5">Assigned Roles</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStaffDetail.roles.map((r) => (
                    <Badge key={r.id} variant="secondary">
                      {r.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-mono uppercase text-muted-foreground mb-1.5">
                  Warehouse Scope
                </h4>
                <p className="text-foreground">
                  {selectedStaffDetail.warehouse
                    ? `${selectedStaffDetail.warehouse.name} (${selectedStaffDetail.warehouse.code})`
                    : "Global Scope"}
                </p>
              </div>

              <div>
                <h4 className="font-mono uppercase text-muted-foreground mb-1.5">
                  Effective Permissions ({selectedStaffDetail.effectivePermissions.length})
                </h4>
                <div className="p-3 border border-border rounded-sm bg-muted/20 max-h-48 overflow-y-auto grid grid-cols-2 gap-1 font-mono text-[11px]">
                  {selectedStaffDetail.effectivePermissions.map((perm) => (
                    <span key={perm} className="text-muted-foreground">
                      • {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-mono uppercase text-muted-foreground mb-1.5">
                  Recent Administrative Actions
                </h4>
                {selectedStaffDetail.activity.length === 0 ? (
                  <p className="text-muted-foreground">No recent audit events.</p>
                ) : (
                  <div className="space-y-2 border border-border rounded-sm p-3 bg-muted/20 max-h-40 overflow-y-auto font-mono text-[11px]">
                    {selectedStaffDetail.activity.map((act) => (
                      <div key={act.id} className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="font-semibold text-foreground">{act.action}</span>
                        <span className="text-muted-foreground">
                          {new Date(act.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {roleModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  Mutate Assigned Roles
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {roleModalStaff.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Assigning high-privilege roles grants immediate administrative control. Note: Self-role mutation and demoting the final Super Admin are blocked by system security.
            </p>

            <div className="space-y-2 p-3 border border-border rounded-sm bg-background max-h-48 overflow-y-auto text-xs">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.slug)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, r.slug]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((x) => x !== r.slug));
                      }
                    }}
                    className="rounded-xs text-primary"
                  />
                  <div>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{r.description}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleModalStaff(null)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateRoles}
                disabled={actionInProgress || selectedRoles.length === 0}
                className="gap-1.5"
              >
                {actionInProgress && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Role Mutation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scope Assignment Modal */}
      {scopeModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  Assign Warehouse Scope
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {scopeModalStaff.email}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-mono uppercase text-muted-foreground">
                Operational Warehouse
              </label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Global Scope (No Warehouse Restrictions)</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScopeModalStaff(null)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateScope}
                disabled={actionInProgress}
                className="gap-1.5"
              >
                {actionInProgress && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Update Scope
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Suspension / Restoration Modal */}
      {statusModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  statusModalStaff.status === StaffStatus.ACTIVE
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  Confirm Staff {statusModalStaff.status === StaffStatus.ACTIVE ? "Suspension" : "Restoration"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {statusModalStaff.email}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {statusModalStaff.status === StaffStatus.ACTIVE
                ? "Suspension revokes administrative dashboard access immediately. Note: The final active Super Admin cannot be suspended."
                : "Restoring this staff member will immediately re-enable their authorized administrative access."}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase text-muted-foreground">
                Audit Reason
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Operational justification (minimum 3 characters)..."
                rows={3}
                className="w-full p-2.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalStaff(null)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                variant={statusModalStaff.status === StaffStatus.ACTIVE ? "destructive" : "primary"}
                size="sm"
                onClick={handleUpdateStatus}
                disabled={actionInProgress || statusReason.trim().length < 3}
                className="gap-1.5"
              >
                {actionInProgress && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm {statusModalStaff.status === StaffStatus.ACTIVE ? "Suspension" : "Restoration"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
