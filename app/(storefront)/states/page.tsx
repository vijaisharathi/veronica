"use client";

import * as React from "react";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, WifiOff, Clock, ShieldAlert, Search } from "lucide-react";

export default function UIStatesShowcasePage() {
  const tabs = [
    {
      id: "empty-cart",
      label: "Empty Cart",
      content: (
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7 text-neutral-400 stroke-[1.5]" />}
          title="Your Shopping Bag Is Empty"
          description="You haven't added any garments to your bag yet. Explore our latest spring drops and timeless essentials."
          actionLabel="Explore Collections"
          actionHref="/shop"
        />
      ),
    },
    {
      id: "empty-wishlist",
      label: "Empty Wishlist",
      content: (
        <EmptyState
          icon={<Heart className="h-7 w-7 text-neutral-400 stroke-[1.5]" />}
          title="Your Wardrobe Wishlist Is Empty"
          description="Curate your private sartorial lookbook by tapping the heart icon on any piece you admire."
          actionLabel="Discover Pieces"
          actionHref="/shop"
        />
      ),
    },
    {
      id: "no-search",
      label: "No Search Results",
      content: (
        <EmptyState
          icon={<Search className="h-7 w-7 text-neutral-400 stroke-[1.5]" />}
          title="No Garments Found"
          description="We couldn't locate any pieces matching your search query. Please verify your keywords or browse popular departments."
          actionLabel="Browse All Garments"
          actionHref="/shop"
        />
      ),
    },
    {
      id: "error-retry",
      label: "Error With Retry",
      content: (
        <ErrorState
          title="Connection Interruption"
          message="We encountered an issue communicating with the catalog service. Please verify your connection."
          onRetry={() => alert("Simulated retry action triggered.")}
        />
      ),
    },
    {
      id: "offline",
      label: "Offline Network",
      content: (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-neutral-300 bg-neutral-50/60 dark:bg-neutral-900/40">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <WifiOff className="h-7 w-7" />
          </div>
          <h4 className="text-base font-serif font-medium tracking-wide text-foreground uppercase mb-1">
            You Are Currently Offline
          </h4>
          <p className="max-w-md text-xs text-muted-foreground leading-relaxed mb-6">
            Internet connection was interrupted. Cached items are accessible, but live prices and checkout remain paused.
          </p>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Reconnect
          </Button>
        </div>
      ),
    },
    {
      id: "slow-network",
      label: "Slow Network Skeletons",
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <Spinner size="sm" />
            <span>Simulating slow network connection • Rendering layout skeletons</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-portrait-fashion w-full rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "session-expired",
      label: "Session Expired",
      content: (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-amber-200/80 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-7 w-7" />
          </div>
          <h4 className="text-base font-serif font-medium tracking-wide text-foreground uppercase mb-1">
            Session Expired
          </h4>
          <p className="max-w-md text-xs text-muted-foreground leading-relaxed mb-6">
            For your security, your session has timed out due to inactivity. Please sign in again to resume your private bag.
          </p>
          <Button size="sm" variant="primary" onClick={() => alert("Redirecting to authentication...")}>
            Sign In Again
          </Button>
        </div>
      ),
    },
    {
      id: "permission-denied",
      label: "Permission Denied",
      content: (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-red-200/80 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h4 className="text-base font-serif font-medium tracking-wide text-foreground uppercase mb-1">
            Access Restricted
          </h4>
          <p className="max-w-md text-xs text-muted-foreground leading-relaxed mb-6">
            You do not possess the required atelier authorization to inspect this resource.
          </p>
          <Button size="sm" variant="secondary" onClick={() => window.location.href = "/"}>
            Return To Storefront
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
      <div className="mb-8 border-b border-border/80 pb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-1">
          Design System Telemetry
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-light text-foreground uppercase tracking-wide">
          Storefront UI State Catalog
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Interactive verification suite for empty states, offline indicators, network skeletons, and error boundaries.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-subtle dark:bg-neutral-900">
        <Tabs tabs={tabs} defaultTab="empty-cart" />
      </div>
    </div>
  );
}
