import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded text-xs font-medium tracking-wide uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-neutral-800 shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-neutral-200 border border-border/60",
        outline:
          "border border-neutral-900 text-neutral-900 bg-transparent hover:bg-neutral-900 hover:text-white dark:border-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-950",
        ghost:
          "text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800",
        gold:
          "bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-red-700 shadow-sm",
        link:
          "text-primary underline-offset-4 hover:underline lowercase normal-case tracking-normal !p-0 !h-auto font-normal",
      },
      size: {
        sm: "h-8 px-3 text-[11px]",
        md: "h-10 px-5 py-2",
        lg: "h-12 px-8 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && <Spinner className="mr-2 h-3.5 w-3.5" />}
        {!isLoading && leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
