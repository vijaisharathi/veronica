"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Check, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/alert";

export default function AccountSettingsPage() {
  const [marketingEmail, setMarketingEmail] = React.useState(true);
  const [marketingSms, setMarketingSms] = React.useState(false);
  const [marketingWhatsapp, setMarketingWhatsapp] = React.useState(true);

  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      // In production calls PATCH /api/account/preferences
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccessMessage("Your communication preferences have been updated.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-10 px-4 sm:px-6 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/account"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Account
        </Link>
      </div>

      <div className="space-y-2 border-b border-border/80 pb-6">
        <h1 className="font-serif text-3xl font-normal text-foreground">
          Preferences & Security
        </h1>
        <p className="text-xs text-muted-foreground">
          Configure personal communication channels, couture launch alerts, and credential security.
        </p>
      </div>

      {successMessage && (
        <Alert variant="success" className="text-xs">
          <Check className="h-4 w-4 mr-2" />
          {successMessage}
        </Alert>
      )}

      {/* Preferences Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-background border border-border p-6 sm:p-8 rounded-sm">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Bell className="h-4 w-4 text-foreground" />
          <h2 className="font-serif text-lg font-medium text-foreground">
            Communication Channels
          </h2>
        </div>

        <div className="space-y-4 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div className="space-y-0.5 max-w-md">
              <label htmlFor="marketing-email" className="text-xs font-medium text-foreground cursor-pointer">
                Editorial Newsletter & Haute Couture Drops
              </label>
              <p className="text-[11px] text-muted-foreground">
                Receive private invitations to runway releases, seasonal lookbooks, and private sales.
              </p>
            </div>
            <Switch
              id="marketing-email"
              checked={marketingEmail}
              onChange={setMarketingEmail}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 max-w-md">
              <label htmlFor="marketing-sms" className="text-xs font-medium text-foreground cursor-pointer">
                SMS Notifications
              </label>
              <p className="text-[11px] text-muted-foreground">
                Receive urgent delivery arrival dispatches directly to your mobile phone.
              </p>
            </div>
            <Switch
              id="marketing-sms"
              checked={marketingSms}
              onChange={setMarketingSms}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 max-w-md">
              <label htmlFor="marketing-whatsapp" className="text-xs font-medium text-foreground cursor-pointer">
                WhatsApp Concierge Updates
              </label>
              <p className="text-[11px] text-muted-foreground">
                Direct WhatsApp communications regarding bespoke reservations and personal styling consultations.
              </p>
            </div>
            <Switch
              id="marketing-whatsapp"
              checked={marketingWhatsapp}
              onChange={setMarketingWhatsapp}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" isLoading={isLoading} className="text-xs tracking-wider uppercase font-medium">
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Security Overview */}
      <div className="space-y-4 bg-background border border-border p-6 sm:p-8 rounded-sm">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Shield className="h-4 w-4 text-foreground" />
          <h2 className="font-serif text-lg font-medium text-foreground">
            Security & Authentication
          </h2>
        </div>

        <div className="text-xs space-y-3 text-muted-foreground">
          <p>
            Your login identity, multi-factor verification, and password encryption are managed through our enterprise authentication layer.
          </p>
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-sm border border-border/80">
            <div>
              <p className="font-medium text-foreground">Password & Identity</p>
              <p className="text-[11px]">Protected by 256-bit encryption</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Reset Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
