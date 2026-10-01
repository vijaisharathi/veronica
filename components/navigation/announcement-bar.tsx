"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { ANNOUNCEMENT_CONFIG } from "@/config/navigation";

export function AnnouncementBar() {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const items = ANNOUNCEMENT_CONFIG.items;

  // Rotate between multiple announcements if more than 1
  React.useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [items.length]);

  if (!ANNOUNCEMENT_CONFIG.enabled || isDismissed || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  if (!currentItem) {
    return null;
  }

  return (
    <aside
      aria-label="Announcement"
      className="bg-neutral-950 text-neutral-200 px-4 py-2 text-[11px] font-mono tracking-widest text-center border-b border-neutral-800 flex items-center justify-between gap-3 relative transition-all duration-300"
    >
      <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden px-6">
        <Sparkles className="h-3 w-3 text-amber-400 shrink-0 select-none animate-pulse" />
        <span className="truncate">
          {currentItem.text}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="text-neutral-400 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 shrink-0"
        aria-label="Dismiss announcement bar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
