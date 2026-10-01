import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, onChange, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex items-center gap-2.5 cursor-pointer text-xs select-none",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span className="relative flex items-center justify-center">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-[3px] border border-neutral-300 bg-white transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-1 peer-checked:bg-neutral-900 peer-checked:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:peer-checked:bg-white dark:peer-checked:border-white"
            )}
          >
            <Check className="h-3 w-3 text-white peer-checked:opacity-100 dark:text-neutral-950 opacity-0 transition-opacity" />
          </span>
        </span>
        {label && <span className="text-neutral-700 dark:text-neutral-300">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
