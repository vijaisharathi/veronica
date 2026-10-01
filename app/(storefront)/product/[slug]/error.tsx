"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log technical details server-side/client console without exposing raw stack trace to customer
    console.error("Product details error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-20 text-center max-w-md space-y-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
        <AlertCircle className="h-6 w-6" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-serif font-light text-foreground">
          Unable to Load Garment Details
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We encountered an unexpected issue while retrieving this atelier piece. Please try refreshing or return to our catalog.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={reset}
          className="w-full sm:w-auto text-xs uppercase tracking-wider"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try Again
        </Button>
        <Link href={ROUTES.SHOP}>
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto text-xs uppercase tracking-wider"
          >
            Browse Collections
          </Button>
        </Link>
      </div>

      <div className="pt-6 border-t border-border/80">
        <Link
          href={ROUTES.HOME}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
