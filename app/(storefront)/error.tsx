"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // In production, report error to observability/telemetry
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-20 min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6 bg-background border border-border p-8 rounded-sm shadow-subtle">
        <div className="h-14 w-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
            Temporary Disruption
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-normal">
            Something Interrupted Your View
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We encountered an unexpected presentation error while rendering this silhouette. Please retry your request or return to the main storefront.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="sm"
            onClick={() => reset()}
            className="w-full sm:w-auto text-xs uppercase tracking-wider font-medium"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Retry View
          </Button>

          <Link href={ROUTES.HOME} className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs uppercase tracking-wider font-medium"
            >
              <Home className="mr-2 h-3.5 w-3.5" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
