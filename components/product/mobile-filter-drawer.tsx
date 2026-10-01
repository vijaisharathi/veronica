"use client";

import * as React from "react";
import { Drawer } from "@/components/ui/drawer";
import { FilterSidebar, FilterSidebarProps } from "./filter-sidebar";
import { Button } from "@/components/ui/button";

export interface MobileFilterDrawerProps extends FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  resultCount?: number;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  resultCount,
  ...sidebarProps
}: MobileFilterDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} side="bottom" title="Filter & Refine">
      <div className="flex flex-col h-full space-y-6">
        <div className="flex-1 overflow-y-auto">
          <FilterSidebar {...sidebarProps} />
        </div>

        <div className="sticky bottom-0 bg-surface pt-3 border-t border-border flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-1/2"
            onClick={sidebarProps.onClearAll}
          >
            Clear All
          </Button>
          <Button
            type="button"
            variant="primary"
            className="w-1/2"
            onClick={onClose}
          >
            Apply {resultCount !== undefined ? `(${resultCount})` : ""}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
