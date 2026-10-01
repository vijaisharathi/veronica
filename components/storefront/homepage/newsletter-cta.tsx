"use client";

import * as React from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewsletterCTA() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please provide a valid email address.");
      return;
    }

    setSubscribed(true);
  };

  return (
    <section
      aria-label="Newsletter Subscription"
      className="bg-neutral-100 dark:bg-neutral-900/60 py-16 sm:py-24 border-t border-border/80"
    >
      <div className="container mx-auto px-4 max-w-xl text-center space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-subtle border border-border/60">
          <Mail className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block font-medium">
            Private Atelier Invitations
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-light text-foreground uppercase tracking-wide">
            Get The VÉRONA Edit
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed font-light">
            New drops. Style inspiration. Priority access to private reductions and bespoke trunk shows.
          </p>
        </div>

        {subscribed ? (
          <div
            role="status"
            className="inline-flex items-center gap-2.5 rounded-full bg-emerald-50 px-6 py-3 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 animate-fade-in"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Thank you for subscribing. Your private access code has been dispatched.</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <div className="flex-1 text-left">
              <label htmlFor="homepage-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="homepage-newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your email address"
                aria-invalid={!!error}
                aria-describedby={error ? "newsletter-error" : undefined}
                className={`h-11 w-full rounded border bg-surface px-4 text-xs text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-800 ${
                  error
                    ? "border-red-500 focus:ring-red-500"
                    : "border-input focus:ring-neutral-900 dark:focus:ring-white"
                }`}
              />
              {error && (
                <p id="newsletter-error" className="mt-1 text-[11px] text-red-500">
                  {error}
                </p>
              )}
            </div>
            <Button
              type="submit"
              size="md"
              variant="primary"
              className="h-11 px-7 tracking-widest text-xs font-semibold shrink-0"
            >
              Join
            </Button>
          </form>
        )}

        <p className="text-[10px] text-muted-foreground font-mono">
          Zero spam. Unsubscribe at any time. Respecting your privacy since inception.
        </p>
      </div>
    </section>
  );
}
