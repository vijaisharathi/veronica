"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function AccountProfilePage() {
  const [firstName, setFirstName] = React.useState("Aria");
  const [lastName, setLastName] = React.useState("Sharma");
  const [displayName, setDisplayName] = React.useState("Aria Sharma");
  const [phone, setPhone] = React.useState("+91 98200 98200");
  const email = "aria.sharma@example.com";

  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      // In production calls PATCH /api/account/profile
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccessMessage("Your profile information has been updated successfully.");
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
          Personal Profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your personal identity details, name pronunciation, and direct contact line.
        </p>
      </div>

      {successMessage && (
        <Alert variant="success" className="text-xs">
          <Check className="h-4 w-4 mr-2" />
          {successMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-background border border-border p-6 sm:p-8 rounded-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground tracking-wide block">
              First Name
            </label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground tracking-wide block">
              Last Name
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground tracking-wide block">
            Display Name
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            How your name appears in your personal styling concierge communications.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground tracking-wide block">
            Email Address
          </label>
          <Input
            value={email}
            disabled
            className="text-xs bg-neutral-100/70 dark:bg-neutral-800 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">
            Managed securely via your verified authentication provider.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground tracking-wide block">
            Phone Number
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98200 98200"
            className="text-xs"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" isLoading={isLoading} className="text-xs tracking-wider uppercase font-medium">
            <Save className="mr-2 h-4 w-4" />
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
