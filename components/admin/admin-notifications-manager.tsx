"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";
import {
  NotificationAdminDTO,
} from "@/modules/notifications/types/notification.types";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@/constants/status";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/components/auth/permission-gate";

interface DeliveryStats {
  totalNotifications: number;
  unreadNotifications: number;
  channelAttempts: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export function AdminNotificationsManager() {
  const { hasPermission } = usePermissions();
  const canRetry = hasPermission(PERMISSIONS.NOTIFICATIONS_RETRY) || hasPermission(PERMISSIONS.NOTIFICATIONS_MANAGE);

  const [notifications, setNotifications] = React.useState<NotificationAdminDTO[]>([]);
  const [stats, setStats] = React.useState<DeliveryStats | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("");
  const [channel, setChannel] = React.useState<string>("");
  const [selectedNotification, setSelectedNotification] = React.useState<NotificationAdminDTO | null>(null);

  // Action states
  const [retryingAttemptId, setRetryingAttemptId] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load delivery statistics", err);
    }
  }, []);

  const fetchNotifications = React.useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: p.toString(),
          limit: "20",
          ...(search ? { search } : {}),
          ...(category ? { category } : {}),
          ...(channel ? { channel } : {}),
        });

        const res = await fetch(`/api/admin/notifications?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setNotifications(json.data.items || []);
            setTotal(json.data.total || 0);
            setTotalPages(json.data.totalPages || 1);
            setPage(json.data.page || 1);
          }
        }
      } catch (err) {
        console.error("Failed to fetch admin notifications", err);
      } finally {
        setLoading(false);
      }
    },
    [search, category, channel]
  );

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  React.useEffect(() => {
    fetchNotifications(page);
  }, [fetchNotifications, page]);

  const handleRetryAttempt = async (notificationId: string, attemptId: string) => {
    if (!canRetry) return;
    setRetryingAttemptId(attemptId);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/notifications/${notificationId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ text: "Delivery attempt retried successfully.", type: "success" });
        // Refresh details
        const detailRes = await fetch(`/api/admin/notifications/${notificationId}`);
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          if (detailJson.success && detailJson.data) {
            setSelectedNotification(detailJson.data);
          }
        }
        fetchNotifications(page);
        fetchStats();
      } else {
        setActionMessage({
          text: json.error?.message || "Failed to retry delivery attempt.",
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error retrying delivery attempt.", type: "error" });
    } finally {
      setRetryingAttemptId(null);
    }
  };

  const getStatusBadge = (status: NotificationDeliveryStatus) => {
    switch (status) {
      case NotificationDeliveryStatus.SENT:
      case NotificationDeliveryStatus.DELIVERED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        );
      case NotificationDeliveryStatus.PENDING:
      case NotificationDeliveryStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
      case NotificationDeliveryStatus.RETRY_PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3 h-3" />
            RETRY PENDING
          </span>
        );
      case NotificationDeliveryStatus.FAILED:
      case NotificationDeliveryStatus.BOUNCED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 border border-stone-200">
            <p className="text-xs uppercase tracking-wider text-stone-500">Total Notifications</p>
            <p className="text-2xl font-serif font-bold text-stone-900 mt-2">
              {stats.totalNotifications.toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Unread in-app: {stats.unreadNotifications}
            </p>
          </div>

          <div className="bg-white p-5 border border-stone-200">
            <p className="text-xs uppercase tracking-wider text-stone-500">Email Dispatches</p>
            <p className="text-2xl font-serif font-bold text-stone-900 mt-2">
              {(stats.channelAttempts[NotificationChannel.EMAIL] || 0).toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 mt-1">Via Resend REST Provider</p>
          </div>

          <div className="bg-white p-5 border border-stone-200">
            <p className="text-xs uppercase tracking-wider text-stone-500">Delivered / Sent</p>
            <p className="text-2xl font-serif font-bold text-emerald-700 mt-2">
              {(
                (stats.statusBreakdown[NotificationDeliveryStatus.DELIVERED] || 0) +
                (stats.statusBreakdown[NotificationDeliveryStatus.SENT] || 0)
              ).toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Verified delivery confirmation</p>
          </div>

          <div className="bg-white p-5 border border-stone-200">
            <p className="text-xs uppercase tracking-wider text-stone-500">Failed / Retry Pending</p>
            <p className="text-2xl font-serif font-bold text-red-600 mt-2">
              {(
                (stats.statusBreakdown[NotificationDeliveryStatus.FAILED] || 0) +
                (stats.statusBreakdown[NotificationDeliveryStatus.RETRY_PENDING] || 0)
              ).toLocaleString()}
            </p>
            <p className="text-xs text-stone-400 mt-1">Eligible for manual staff retry</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, event ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-900"
          >
            <option value="">All Categories</option>
            {Object.values(NotificationCategory).map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-900"
          >
            <option value="">All Channels</option>
            {Object.values(NotificationChannel).map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              fetchNotifications(page);
              fetchStats();
            }}
            className="p-2 border border-stone-200 hover:bg-stone-50 text-stone-700"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white border border-stone-200 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-medium">Timestamp</th>
              <th className="py-3 px-4 font-medium">Customer / Recipient</th>
              <th className="py-3 px-4 font-medium">Category / Event</th>
              <th className="py-3 px-4 font-medium">Title & Message</th>
              <th className="py-3 px-4 font-medium">Channels</th>
              <th className="py-3 px-4 font-medium">Attempts</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-400">
                  Loading notifications audit trail...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-stone-400">
                  No notifications match the active filter criteria.
                </td>
              </tr>
            ) : (
              notifications.map((n) => {
                const latestAttempt = n.deliveryAttempts[n.deliveryAttempts.length - 1];

                return (
                  <tr key={n.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString()}{" "}
                      <span className="text-[10px] text-stone-400">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-stone-900">
                        {n.customerName || "Valued Client"}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate max-w-[160px]">
                        {n.customerEmail || n.customerId}
                      </p>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-stone-100 text-stone-700">
                        {n.category.replace("_", " ")}
                      </span>
                      <p className="text-[10px] text-stone-400 font-mono mt-1">
                        {n.eventType || n.type}
                      </p>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-medium text-stone-900 truncate">{n.title}</p>
                      <p className="text-stone-500 text-[11px] truncate">{n.message}</p>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {n.channels.map((ch) => (
                          <span
                            key={ch}
                            className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {latestAttempt ? (
                        getStatusBadge(latestAttempt.status)
                      ) : (
                        <span className="text-stone-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedNotification(n)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] uppercase tracking-wider border border-stone-300 hover:border-stone-900 text-stone-700 hover:text-stone-900 transition-colors"
                      >
                        Inspect
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <span>
              Showing page {page} of {totalPages} ({total} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border border-stone-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border border-stone-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Delivery Attempts Inspection Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h3 className="text-lg font-serif tracking-tight text-stone-900">
                  Notification Audit Trail
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  ID: {selectedNotification.id} | Event: {selectedNotification.eventId || "N/A"}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedNotification(null);
                  setActionMessage(null);
                }}
                className="p-1 hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionMessage && (
              <div
                className={`p-3 text-xs flex items-center gap-2 ${
                  actionMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                <span>{actionMessage.text}</span>
              </div>
            )}

            {/* Notification Summary */}
            <div className="bg-stone-50 p-4 border border-stone-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-stone-500">Recipient:</span>{" "}
                  <strong className="text-stone-900">
                    {selectedNotification.customerName || selectedNotification.customerId}
                  </strong>{" "}
                  ({selectedNotification.customerEmail || "No Email"})
                </div>
                <div>
                  <span className="text-stone-500">Priority:</span>{" "}
                  <strong className="uppercase">{selectedNotification.priority}</strong>
                </div>
                <div>
                  <span className="text-stone-500">Type:</span>{" "}
                  <span>{selectedNotification.type}</span>
                </div>
                <div>
                  <span className="text-stone-500">Created:</span>{" "}
                  <span>{new Date(selectedNotification.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <span className="text-stone-500">Title:</span>{" "}
                <span className="font-semibold text-stone-900">{selectedNotification.title}</span>
              </div>
              <div>
                <span className="text-stone-500">Message:</span>{" "}
                <span className="text-stone-700">{selectedNotification.message}</span>
              </div>

              {selectedNotification.actionUrl && (
                <div className="pt-2">
                  <span className="text-stone-500">Action Link:</span>{" "}
                  <a
                    href={selectedNotification.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-900 underline inline-flex items-center gap-1 font-mono text-[11px]"
                  >
                    {selectedNotification.actionUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Delivery Attempts List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                Delivery Attempts ({selectedNotification.deliveryAttempts.length})
              </h4>

              {selectedNotification.deliveryAttempts.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center border border-dashed border-stone-200">
                  No separate channel attempts recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedNotification.deliveryAttempts.map((attempt) => {
                    const isRetryable =
                      (attempt.status === NotificationDeliveryStatus.FAILED ||
                        attempt.status === NotificationDeliveryStatus.RETRY_PENDING) &&
                      attempt.attemptNumber < 3;

                    return (
                      <div
                        key={attempt.id}
                        className="p-4 border border-stone-200 bg-white space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-stone-900 text-white uppercase tracking-wider">
                              {attempt.channel}
                            </span>
                            <span className="text-stone-500">
                              Attempt #{attempt.attemptNumber}
                            </span>
                            <span>•</span>
                            <span className="text-stone-600 font-mono text-[11px]">
                              {attempt.provider}
                            </span>
                          </div>

                          <div>{getStatusBadge(attempt.status)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-500 pt-1">
                          <div>
                            Recipient: <span className="font-mono text-stone-800">{attempt.recipient}</span>
                          </div>
                          {attempt.providerMessageId && (
                            <div>
                              Message ID:{" "}
                              <span className="font-mono text-stone-800">
                                {attempt.providerMessageId}
                              </span>
                            </div>
                          )}
                          <div>Attempted: {new Date(attempt.attemptedAt).toLocaleString()}</div>
                          {attempt.completedAt && (
                            <div>Completed: {new Date(attempt.completedAt).toLocaleString()}</div>
                          )}
                        </div>

                        {attempt.errorMessage && (
                          <div className="p-2 bg-red-50 text-red-700 text-[11px] border border-red-200">
                            <strong>Error:</strong> {attempt.errorMessage}
                          </div>
                        )}

                        {isRetryable && canRetry && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() =>
                                handleRetryAttempt(selectedNotification.id, attempt.id)
                              }
                              disabled={retryingAttemptId === attempt.id}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              {retryingAttemptId === attempt.id ? "Retrying..." : "Retry Channel Send"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-200">
              <button
                onClick={() => {
                  setSelectedNotification(null);
                  setActionMessage(null);
                }}
                className="px-4 py-2 text-xs uppercase tracking-wider border border-stone-300 text-stone-700 hover:text-stone-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
