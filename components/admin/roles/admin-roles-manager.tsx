"use client";

import * as React from "react";
import {
  Key,
  Users,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { AdminRoleDTO, AdminPermissionDTO } from "@/modules/admin/types/admin-management.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminRolesManager() {
  const [roles, setRoles] = React.useState<AdminRoleDTO[]>([]);
  const [permissions, setPermissions] = React.useState<AdminPermissionDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Selected Role for Permission Matrix
  const [selectedRole, setSelectedRole] = React.useState<AdminRoleDTO | null>(null);
  const [rolePermissions, setRolePermissions] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rRes, pRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions"),
      ]);

      if (!rRes.ok || !pRes.ok) {
        throw new Error("Failed to load roles and permission catalog");
      }

      const rJson = await rRes.json();
      const pJson = await pRes.json();

      setRoles(rJson.data);
      setPermissions(pJson.data);

      if (rJson.data.length > 0 && !selectedRole) {
        setSelectedRole(rJson.data[0]);
        setRolePermissions(rJson.data[0].permissions);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectRole = (role: AdminRoleDTO) => {
    setSelectedRole(role);
    setRolePermissions(role.permissions);
    setSuccessMessage(null);
    setError(null);
  };

  const togglePermission = (code: string) => {
    if (!selectedRole || selectedRole.slug === "super-admin") return;
    if (rolePermissions.includes(code)) {
      setRolePermissions(rolePermissions.filter((p) => p !== code));
    } else {
      setRolePermissions([...rolePermissions, code]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: rolePermissions }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update role permissions");
      }

      setSuccessMessage(`Permissions successfully updated for ${selectedRole.name}`);
      // Refresh roles
      const updatedRoles = roles.map((r) =>
        r.id === selectedRole.id ? { ...r, permissions: rolePermissions } : r
      );
      setRoles(updatedRoles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module
  const permissionsByModule = React.useMemo(() => {
    const map = new Map<string, AdminPermissionDTO[]>();
    for (const p of permissions) {
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [permissions]);

  return (
    <div className="space-y-6">
      {/* Feedback Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-sm text-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)} className="ml-auto h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List Panel */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            Configured Roles ({roles.length})
          </h2>

          <div className="space-y-2">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`p-4 border rounded-sm cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-card ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card/60 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-medium text-foreground text-sm">
                      {r.name}
                    </span>
                    {r.isSystem && (
                      <Badge variant="outline" className="border-border text-[10px] font-mono">
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {r.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {r.staffCount} {r.staffCount === 1 ? "staff" : "staff"}
                    </span>
                    <span>{r.slug === "super-admin" ? "All Permissions" : `${r.permissions.length} perms`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permission Matrix Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRole ? (
            <div className="p-6 border border-border bg-card rounded-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-serif font-medium text-foreground">
                      {selectedRole.name}
                    </h3>
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded-xs text-muted-foreground">
                      {selectedRole.slug}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedRole.description}
                  </p>
                </div>

                {selectedRole.slug !== "super-admin" && (
                  <Button
                    size="sm"
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="gap-1.5 shrink-0"
                  >
                    {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    Save Permissions
                  </Button>
                )}
              </div>

              {selectedRole.slug === "super-admin" ? (
                <div className="p-6 border border-border bg-muted/20 rounded-sm text-center space-y-2">
                  <Lock className="h-8 w-8 text-primary mx-auto" />
                  <h4 className="font-serif text-sm font-medium text-foreground">
                    Inherent Super Admin Privileges
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    The Super Admin role inherently holds all platform permissions across all modules and cannot be restricted.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                  {Array.from(permissionsByModule.entries()).map(([moduleName, modulePerms]) => (
                    <div key={moduleName} className="space-y-2">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border pb-1">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        {moduleName} Module ({modulePerms.length})
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {modulePerms.map((perm) => {
                          const isGranted = rolePermissions.includes(perm.code);
                          return (
                            <label
                              key={perm.code}
                              className={`p-2.5 border rounded-sm flex items-start gap-2.5 cursor-pointer transition-colors ${
                                isGranted
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border bg-background hover:bg-muted/10"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isGranted}
                                onChange={() => togglePermission(perm.code)}
                                className="mt-0.5 rounded-xs text-primary"
                              />
                              <div>
                                <span className="font-medium text-foreground block">
                                  {perm.name}
                                </span>
                                <code className="text-[10px] text-muted-foreground font-mono block">
                                  {perm.code}
                                </code>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 border border-border bg-card rounded-sm text-center text-xs text-muted-foreground">
              Select a role on the left to inspect its permission matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
