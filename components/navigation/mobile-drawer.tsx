"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { PRIMARY_NAVIGATION } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { ChevronDown, User, HelpCircle, ShieldCheck, ArrowRight } from "lucide-react";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function MobileDrawer({ isOpen, onClose, triggerRef }: MobileDrawerProps) {
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>("men");

  const handleClose = React.useCallback(() => {
    onClose();
    if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [onClose, triggerRef]);

  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} side="left" title="Collections">
      <div className="flex flex-col h-full justify-between space-y-6">
        {/* Navigation Categories Accordion */}
        <div className="space-y-1">
          {PRIMARY_NAVIGATION.map((cat) => {
            const isExpanded = expandedCategory === cat.id;

            return (
              <div key={cat.id} className="border-b border-border/60 py-2">
                <div className="flex items-center justify-between">
                  <Link
                    href={cat.href}
                    onClick={handleClose}
                    className={`text-xs font-semibold uppercase tracking-widest hover:text-neutral-600 transition-colors ${
                      cat.isSale ? "text-red-600 dark:text-red-400" : "text-foreground"
                    }`}
                  >
                    {cat.name}
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle ${cat.name} subcategories`}
                    className="p-2 text-neutral-400 hover:text-foreground focus:outline-none"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="pl-3 pr-1 py-2 space-y-4 animate-fade-in">
                    {cat.megaMenu.sections.map((section, sIdx) => (
                      <div key={sIdx} className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                          {section.title}
                        </span>
                        <ul className="space-y-2 pl-2">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx}>
                              <Link
                                href={item.href}
                                onClick={handleClose}
                                className="block text-xs text-neutral-700 hover:text-foreground dark:text-neutral-300 transition-colors"
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    <div className="pt-2">
                      <Link
                        href={cat.href}
                        onClick={handleClose}
                        className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                      >
                        Explore All {cat.name} <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Customer Account & Assistance Entry Points */}
        <div className="pt-6 border-t border-border/80 space-y-3">
          <Link
            href={ROUTES.ACCOUNT}
            onClick={handleClose}
            className="flex items-center gap-3 text-xs font-medium text-neutral-700 hover:text-foreground dark:text-neutral-300 transition-colors"
          >
            <User className="h-4 w-4 text-neutral-500" />
            <span>Client Account &amp; Profile</span>
          </Link>
          <Link
            href={ROUTES.STATES}
            onClick={handleClose}
            className="flex items-center gap-3 text-xs font-medium text-neutral-700 hover:text-foreground dark:text-neutral-300 transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-neutral-500" />
            <span>Customer Concierge &amp; FAQ</span>
          </Link>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>100% Genuine Designer Guarantee</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
