"use client";

import * as React from "react";
import { WifiOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({ onRetry, className = "" }: OfflineStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`border border-border/80 p-8 sm:p-12 rounded-sm bg-background text-center max-w-md mx-auto space-y-5 shadow-subtle ${className}`}
    >
      <div className="h-14 w-14 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center">
        <WifiOff className="h-6 w-6 stroke-[1.5]" />
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Network Disconnected
        </span>
        <h3 className="font-serif text-xl sm:text-2xl text-foreground font-light">
          You Are Currently Offline
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please check your mobile data or Wi-Fi connectivity. VÉRONA will restore the runway presentation as soon as connection is re-established.
        </p>
      </div>

      <div className="pt-2">
        <Button
          size="sm"
          onClick={() => {
            if (onRetry) onRetry();
            else window.location.reload();
          }}
          className="text-xs uppercase tracking-wider font-medium"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reconnect
        </Button>
      </div>
    </div>
  );
}
