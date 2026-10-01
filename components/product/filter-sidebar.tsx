"use client";

import * as React from "react";
import { FilterGroup, ActiveFilter } from "@/types/storefront";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio } from "@/components/ui/radio";
import { Accordion } from "@/components/ui/accordion";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterSidebarProps {
  filterGroups: FilterGroup[];
  activeFilters: ActiveFilter[];
  onToggleFilter: (groupId: string, groupName: string, value: string, label: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterSidebar({
  filterGroups,
  activeFilters,
  onToggleFilter,
  onClearAll,
  className,
}: FilterSidebarProps) {
  const isFilterActive = (groupId: string, value: string) => {
    return activeFilters.some((f) => f.groupId === groupId && f.value === value);
  };

  const accordionItems = filterGroups.map((group) => {
    let content: React.ReactNode = null;

    if (group.type === "color") {
      content = (
        <div className="flex flex-wrap gap-2 pt-1">
          {group.options.map((opt) => {
            const active = isFilterActive(group.id, opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggleFilter(group.id, group.name, opt.value, opt.label)}
                title={`${opt.label} (${opt.count})`}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
                  active
                    ? "ring-2 ring-neutral-900 ring-offset-1 scale-110 dark:ring-white"
                    : "border-border hover:scale-105"
                )}
                style={{ backgroundColor: opt.colorHex || "#ccc" }}
              />
            );
          })}
        </div>
      );
    } else if (group.type === "size") {
      content = (
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {group.options.map((opt) => {
            const active = isFilterActive(group.id, opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggleFilter(group.id, group.name, opt.value, opt.label)}
                className={cn(
                  "flex h-8 items-center justify-center rounded border text-xs font-mono transition-all",
                  active
                    ? "bg-neutral-900 text-white font-bold dark:bg-white dark:text-neutral-900"
                    : "border-border hover:border-neutral-900 text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    } else if (group.type === "radio") {
      content = (
        <div className="space-y-2 pt-1">
          {group.options.map((opt) => (
            <Radio
              key={opt.value}
              checked={isFilterActive(group.id, opt.value)}
              onChange={() => onToggleFilter(group.id, group.name, opt.value, opt.label)}
              label={
                <span className="flex items-center justify-between w-full text-xs">
                  <span>{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">
                      ({opt.count})
                    </span>
                  )}
                </span>
              }
            />
          ))}
        </div>
      );
    } else {
      // Default: Checkbox multi-select
      content = (
        <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
          {group.options.map((opt) => (
            <Checkbox
              key={opt.value}
              checked={isFilterActive(group.id, opt.value)}
              onChange={() => onToggleFilter(group.id, group.name, opt.value, opt.label)}
              label={
                <span className="flex items-center justify-between w-full text-xs">
                  <span>{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">
                      ({opt.count})
                    </span>
                  )}
                </span>
              }
            />
          ))}
        </div>
      );
    }

    return {
      id: group.id,
      title: group.name,
      content,
    };
  });

  return (
    <aside className={cn("w-full space-y-4", className)}>
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Filter By
        </h3>
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-600 transition-colors uppercase font-mono"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      <Accordion
        items={accordionItems}
        allowMultiple={true}
        defaultExpanded={["gender", "category", "size", "price"]}
      />
    </aside>
  );
}
