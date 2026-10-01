"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right" | "bottom";
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  side = "right",
  title,
  children,
  className,
}: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = {
    left: "top-0 bottom-0 left-0 w-full max-w-xs sm:max-w-sm border-r",
    right: "top-0 bottom-0 right-0 w-full max-w-xs sm:max-w-md border-l",
    bottom: "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl border-t",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div
        className={cn(
          "fixed z-10 flex flex-col bg-surface shadow-floating border-border transition-transform dark:bg-neutral-900",
          sideClasses[side],
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          {title ? (
            <h3 className="text-sm font-medium uppercase tracking-wider text-foreground">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            type="button"
            className="rounded-full p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
