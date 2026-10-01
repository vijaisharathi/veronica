"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Truck,
  RotateCcw,
  Star,
  ShieldAlert,
  CreditCard,
  Package,
  Check,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { NotificationPublicDTO } from "@/modules/notifications/types/notification.types";
import { NotificationCategory, NotificationPriority } from "@/constants/status";

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<NotificationPublicDTO[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchNotifications = React.useCallback(async (p: number, unread: boolean) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: p.toString(),
        limit: "15",
        ...(unread ? { unreadOnly: "true" } : {}),
      });

      const res = await fetch(`/api/account/notifications?${query.toString()}`);
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
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications(page, unreadOnly);
  }, [fetchNotifications, page, unreadOnly]);

  const handleMarkRead = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/account/notifications/${id}/read`, {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
        );
      }
    } catch (err) {
      console.error("Error marking notification read", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading("all");
    try {
      const res = await fetch("/api/account/notifications/read-all", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
      }
    } catch (err) {
      console.error("Error marking all read", err);
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case NotificationCategory.ORDERS:
        return <Package className="w-4 h-4 text-stone-700" />;
      case NotificationCategory.PAYMENTS:
        return <CreditCard className="w-4 h-4 text-stone-700" />;
      case NotificationCategory.DELIVERY:
        return <Truck className="w-4 h-4 text-stone-700" />;
      case NotificationCategory.RETURNS_REFUNDS:
        return <RotateCcw className="w-4 h-4 text-stone-700" />;
      case NotificationCategory.REVIEWS:
        return <Star className="w-4 h-4 text-stone-700" />;
      case NotificationCategory.SECURITY:
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-stone-700" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-stone-900">Notification Center</h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">
            Atelier dispatches & verified communication ({total} updates)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/account/settings/notifications"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs tracking-wider uppercase border border-stone-300 hover:border-stone-900 text-stone-700 hover:text-stone-900 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Preferences
          </Link>

          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading === "all" || notifications.every((n) => n.read)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wider uppercase bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`pb-3 text-xs tracking-widest uppercase transition-colors relative font-medium ${
            !unreadOnly
              ? "text-stone-900 border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          All Updates
        </button>
        <button
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`pb-3 ml-4 text-xs tracking-widest uppercase transition-colors relative font-medium ${
            unreadOnly
              ? "text-stone-900 border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* List Content */}
      {loading ? (
        <div className="py-20 text-center">
          <p className="text-xs tracking-widest uppercase text-stone-400 animate-pulse">
            Loading atelier communications...
          </p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-stone-200 p-8">
          <Bell className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-serif tracking-tight text-stone-800">
            {unreadOnly ? "No Unread Notifications" : "No Notifications Yet"}
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {unreadOnly
              ? "You are up to date on all atelier selections, shipments, and account security notifications."
              : "Order updates, tracking waybills, and bespoke atelier alerts will appear here."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100 border border-stone-200 bg-white">
          {notifications.map((notification) => {
            const isUnread = !notification.read;
            const isSecurity = notification.priority === NotificationPriority.CRITICAL;

            return (
              <div
                key={notification.id}
                className={`p-5 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  isUnread
                    ? isSecurity
                      ? "bg-red-50/40"
                      : "bg-stone-50/60"
                    : "bg-white hover:bg-stone-50/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2.5 rounded-none border ${
                      isSecurity
                        ? "bg-red-50 border-red-200"
                        : "bg-stone-100 border-stone-200"
                    }`}
                  >
                    {getCategoryIcon(notification.category)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-medium tracking-tight ${
                          isUnread ? "text-stone-900 font-semibold" : "text-stone-700"
                        }`}
                      >
                        {notification.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-stone-900 inline-block" />
                      )}
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-3 pt-2 text-[11px] text-stone-400">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span className="uppercase tracking-wider">
                        {notification.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right CTA / Read Actions */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {notification.actionUrl && (
                    <Link
                      href={notification.actionUrl}
                      onClick={() => {
                        if (isUnread) handleMarkRead(notification.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-900 hover:text-stone-600 uppercase tracking-wider"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {isUnread && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      disabled={actionLoading === notification.id}
                      className="text-[11px] text-stone-500 hover:text-stone-900 tracking-wider uppercase transition-colors"
                    >
                      {actionLoading === notification.id ? "Saving..." : "Mark Read"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-200 pt-4">
          <p className="text-xs text-stone-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs uppercase tracking-wider border border-stone-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs uppercase tracking-wider border border-stone-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
