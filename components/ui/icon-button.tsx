import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<ButtonProps, "leftIcon" | "rightIcon"> {
  "aria-label": string;
  badge?: number | string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, badge, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        variant="ghost"
        className={cn("relative rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors", className)}
        {...props}
      >
        {children}
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white dark:bg-white dark:text-neutral-900 shadow-sm animate-fade-in">
            {badge}
          </span>
        )}
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";
