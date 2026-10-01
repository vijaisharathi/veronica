import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
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
            type="radio"
            id={inputId}
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 bg-white transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-1 peer-checked:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:peer-checked:border-white">
            <span className="h-2 w-2 rounded-full bg-neutral-900 opacity-0 transition-opacity peer-checked:opacity-100 dark:bg-white" />
          </span>
        </span>
        {label && <span className="text-neutral-700 dark:text-neutral-300">{label}</span>}
      </label>
    );
  }
);

Radio.displayName = "Radio";
