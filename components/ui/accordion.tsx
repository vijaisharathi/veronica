"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  className?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultExpanded = [],
  className,
}: AccordionProps) {
  const [expanded, setExpanded] = React.useState<string[]>(defaultExpanded);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setExpanded((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setExpanded((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn("divide-y divide-border/80 border-y border-border/80", className)}>
      {items.map((item) => {
        const isExpanded = expanded.includes(item.id);

        return (
          <div key={item.id} className="py-1">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground hover:text-neutral-600 transition-colors"
            >
              <span>{item.title}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-neutral-400 transition-transform duration-200",
                  isExpanded && "rotate-180 text-foreground"
                )}
              />
            </button>

            {isExpanded && (
              <div className="pb-4 pt-1 text-xs text-neutral-600 dark:text-neutral-400 animate-accordion-down">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
