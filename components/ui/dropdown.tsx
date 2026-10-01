"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "right",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-2 w-48 rounded-md bg-surface p-1 shadow-elevated border border-border focus:outline-none dark:bg-neutral-900 animate-fade-in",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {items.map((item, index) => {
            const content = (
              <>
                {item.icon && <span className="mr-2 text-neutral-500">{item.icon}</span>}
                <span>{item.label}</span>
              </>
            );

            const itemClass = cn(
              "flex w-full items-center rounded px-3 py-2 text-xs tracking-wide transition-colors",
              item.destructive
                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                : "text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800",
              item.disabled && "opacity-50 pointer-events-none"
            );

            if (item.href) {
              return (
                <a
                  key={index}
                  href={item.href}
                  className={itemClass}
                  onClick={() => setIsOpen(false)}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={itemClass}
                disabled={item.disabled}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
