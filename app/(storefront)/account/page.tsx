"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Bell, Shield, LogOut, ArrowRight, CheckCircle2, Heart, Eye, MapPin, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function AccountPage() {
  const router = useRouter();
  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false);
  const [profile] = React.useState({
    displayName: "Aria Sharma",
    email: "aria.sharma@example.com",
    phone: "+91 98200 98200",
    status: "ACTIVE",
    membershipTier: "Gold Atelier Client",
    emailVerified: true,
  });

  const handleLogout = () => {
    // In production with Clerk, triggers clerk.signOut()
    setIsLogoutOpen(false);
    router.push("/login");
  };

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Account Hero Header */}
      <div className="border-b border-border/80 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Client Portal
            </span>
            <Badge variant="secondary" className="text-[10px] tracking-wider uppercase">
              {profile.membershipTier}
            </Badge>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground">
            Welcome, {profile.displayName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your personal profile, bespoke fitting sizes, communication preferences, and security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLogoutOpen(true)}
            className="text-xs tracking-wider uppercase text-neutral-600 dark:text-neutral-400"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Account Grid Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order History Card (Phase 19) */}
        <div className="bg-background border border-primary/40 p-6 space-y-4 rounded-sm shadow-subtle hover:border-primary transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Order History
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Track your atelier orders, status progressions, and invoices.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground">Full status history</p>
              <p>Self-service cancellation available</p>
            </div>
          </div>

          <Link href="/account/orders" className="pt-4 block">
            <Button size="sm" className="w-full justify-between text-xs tracking-wider uppercase">
              View All Orders
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        {/* Profile Card */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Personal Information
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your name, verified email, and contact telephone number.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">{profile.displayName}</p>
              <p>{profile.email}</p>
              <p>{profile.phone}</p>
            </div>
          </div>

          <Link href="/account/profile" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              Edit Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Preferences Card */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Communication Preferences
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Customize couture drop alerts, editorial newsletters, and order status channels.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Editorial Newsletter: Active
              </p>
              <p className="flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                WhatsApp Drop Alerts: Active
              </p>
            </div>
          </div>

          <Link href="/account/settings" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              Manage Preferences
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Security & Access Card */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Security & Authentication
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Password recovery, multi-factor verification, and session control.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground">Password last updated: Recent</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">Session Secure</p>
            </div>
          </div>

          <Link href="/account/settings" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              Security Settings
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Client Wardrobe / Wishlist Card */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Heart className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Saved Selections
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your private atelier wardrobe, seasonal wishlists, and curated silhouettes.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground">Atelier curation active</p>
              <p>Synchronized across sessions</p>
            </div>
          </div>

          <Link href="/account/wishlist" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              View Wishlist
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Browsing History / Recently Viewed Card */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <Eye className="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Browsing History
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Revisit silhouettes and handcrafted garments from your recent exploration.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground">Recent atelier exploration</p>
              <p>Private &amp; session-isolated</p>
            </div>
          </div>

          <Link href="/account/recently-viewed" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              View History
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Delivery Addresses Card */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-foreground">
              <MapPin className="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Delivery Addresses
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Manage your saved delivery destinations and default shipping address.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground">Primary atelier delivery</p>
              <p>Pan-India coverage verified</p>
            </div>
          </div>

          <Link href="/account/addresses" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              Manage Addresses
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Reviews & Ratings Card (Phase 24) */}
        <div className="bg-background border border-border p-6 space-y-4 rounded-sm shadow-subtle hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-amber-500">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                Reviews &amp; Ratings
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Manage your verified atelier garment reviews, ratings, and shared styling photos.
              </p>
            </div>
            <div className="pt-2 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground">Verified purchase attribution</p>
              <p>Self-service editing &amp; photo uploads</p>
            </div>
          </div>

          <Link href="/account/reviews" className="pt-4 block">
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              My Product Reviews
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out of VÉRONA"
        message="Are you sure you wish to end your session? You can sign back in at any time to access your saved items and personalized selections."
        confirmLabel="Confirm Sign Out"
        cancelLabel="Remain Signed In"
      />
    </div>
  );
}
