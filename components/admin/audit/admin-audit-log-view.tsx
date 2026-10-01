"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  History,
  Download,
  Eye,
  AlertTriangle,
  User,
  Server,
} from "lucide-react";
import { AuditActorType } from "@/constants/status";
import { AdminAuditLogDTO } from "@/modules/admin/types/admin-management.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminAuditLogView() {
  const [logs, setLogs] = React.useState<AdminAuditLogDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = React.useState("");
  const [actorTypeFilter, setActorTypeFilter] = React.useState<string>("ALL");
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 25;

  // Selected Log Record for Inspector
  const [selectedLog, setSelectedLog] = React.useState<AdminAuditLogDTO | null>(null);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (actorTypeFilter !== "ALL") params.set("actorType", actorTypeFilter);
      if (entityTypeFilter !== "ALL") params.set("entityType", entityTypeFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load audit records");
      }

      setLogs(json.data.data);
      setTotal(json.data.pagination.total);
      setTotalPages(json.data.pagination.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [page, actorTypeFilter, entityTypeFilter, search]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/audit-logs/export?format=${format}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Audit export failed");
      }

      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verona-audit-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Total Recorded Mutations
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-foreground">{total}</p>
          </div>
          <History className="h-8 w-8 text-primary/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              Staff Actions in Page
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-foreground">
              {logs.filter((l) => l.actorType === AuditActorType.STAFF).length}
            </p>
          </div>
          <User className="h-8 w-8 text-primary/40" />
        </div>
        <div className="p-5 border border-border bg-card rounded-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              System Events in Page
            </p>
            <p className="text-2xl font-serif font-medium mt-1 text-foreground">
              {logs.filter((l) => l.actorType === AuditActorType.SYSTEM).length}
            </p>
          </div>
          <Server className="h-8 w-8 text-primary/40" />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-sm text-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {/* Toolbar */}
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
              placeholder="Search by action, entity, or actor..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={actorTypeFilter}
            onChange={(e) => {
              setActorTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Actors</option>
            <option value={AuditActorType.STAFF}>Staff</option>
            <option value={AuditActorType.SYSTEM}>System</option>
            <option value={AuditActorType.CUSTOMER}>Customer</option>
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Entities</option>
            <option value="Customer">Customer</option>
            <option value="Staff">Staff</option>
            <option value="Role">Role</option>
            <option value="SystemSettings">Settings</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={loading || logs.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export Audit
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-mono text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Querying append-only audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <code className="text-xs font-mono font-medium text-foreground bg-muted/40 px-2 py-0.5 rounded-xs">
                        {l.action}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-mono text-foreground">
                        {l.actorEmail || l.actorId}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
                        {l.actorType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-foreground">{l.entityType}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{l.entityId}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(l)}
                        className="h-8 px-2 gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
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
            Showing {logs.length} of {total} records
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

      {/* Inspect Audit Record Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">
                  Audit Record Inspection
                </h3>
                <code className="text-xs font-mono text-primary">{selectedLog.action}</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 border border-border rounded-sm bg-muted/20">
                <div>
                  <span className="text-muted-foreground font-mono">Actor ID / Email:</span>
                  <p className="font-mono text-foreground font-medium">
                    {selectedLog.actorEmail || selectedLog.actorId}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono">Actor Type:</span>
                  <p className="font-mono text-foreground font-medium">{selectedLog.actorType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono">Target Entity:</span>
                  <p className="font-mono text-foreground font-medium">
                    {selectedLog.entityType} ({selectedLog.entityId})
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono">Timestamp:</span>
                  <p className="font-mono text-foreground font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-muted-foreground font-mono">Client IP:</span>
                    <p className="font-mono text-foreground">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>

              {selectedLog.before && (
                <div>
                  <h4 className="font-mono uppercase text-muted-foreground mb-1">State Before</h4>
                  <pre className="p-3 bg-muted/30 border border-border rounded-sm text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <h4 className="font-mono uppercase text-muted-foreground mb-1">State After</h4>
                  <pre className="p-3 bg-muted/30 border border-border rounded-sm text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h4 className="font-mono uppercase text-muted-foreground mb-1">Context Metadata</h4>
                  <pre className="p-3 bg-muted/30 border border-border rounded-sm text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
