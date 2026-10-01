import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminAuditLogView } from "@/components/admin/audit/admin-audit-log-view";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsAliasPage() {
  await requirePermission(PERMISSIONS.AUDIT_READ);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-normal text-foreground">
          System Audit Trail
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          VÉRONA Security Operations • Immutable Append-Only Log • Actor & Mutation Correlation
        </p>
      </div>

      <AdminAuditLogView />
    </div>
  );
}
