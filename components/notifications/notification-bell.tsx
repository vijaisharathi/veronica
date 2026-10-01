"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ className }: { className?: string }) {
  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/account/notifications/unread-count");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUnreadCount(json.data.unreadCount || 0);
        }
      }
    } catch {
      // Gracefully ignore fetch errors for guest or offline sessions
    }
  }, []);

  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 60s background sync
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <Link
      href="/account/notifications"
      className={`relative inline-flex items-center justify-center p-2 text-stone-700 hover:text-black transition-colors ${
        className || ""
      }`}
      aria-label="View atelier notifications"
    >
      <Bell className="w-5 h-5 stroke-[1.5]" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-black rounded-full leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
