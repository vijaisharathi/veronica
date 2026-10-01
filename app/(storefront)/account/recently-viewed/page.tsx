import * as React from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ROUTES } from "@/config/routes";

export const metadata: Metadata = {
  title: "Browsing History — VÉRONA Account",
  description: "View and manage your recently explored garments and seasonal silhouettes.",
};

export default function AccountRecentlyViewedPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: "Account", href: ROUTES.ACCOUNT },
          { label: "Browsing History" },
        ]}
      />

      <div className="border-b border-border/80 pb-6 space-y-2">
        <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Atelier Footprint
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-light tracking-tight">
          Browsing History
        </h1>
        <p className="text-xs text-muted-foreground max-w-xl">
          Silhouettes, seasonal releases, and bespoke garments you recently viewed during your visits.
        </p>
      </div>

      <RecentlyViewed
        title="Recently Explored Garments"
        subtitle="Manage your personal browsing footprint across the maison."
        limit={24}
        showClearAction={true}
      />
    </div>
  );
}
