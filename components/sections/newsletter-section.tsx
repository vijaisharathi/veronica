"use client";

import * as React from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewsletterSection() {
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSubscribed(true);
    }
  };

  return (
    <section className="bg-neutral-100 dark:bg-neutral-900/60 py-16 sm:py-20 border-t border-border/80">
      <div className="container mx-auto px-4 max-w-xl text-center space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-subtle">
          <Mail className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground block">
            Private Atelier Invitations
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-light text-foreground uppercase tracking-wide">
            Subscribe To The VÉRONA Gazette
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Gain priority reservation access to bespoke trunk shows, private reductions, and new runway collections.
          </p>
        </div>

        {subscribed ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-2.5 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Thank you for subscribing. Your private access code has been dispatched.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="h-11 flex-1 rounded border border-input bg-surface px-4 text-xs text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:bg-neutral-800"
            />
            <Button type="submit" size="md" variant="primary" className="h-11 px-6 tracking-widest text-xs font-semibold">
              Subscribe
            </Button>
          </form>
        )}

        <p className="text-[10px] text-muted-foreground">
          Zero spam. Unsubscribe at any time. Respecting your privacy since inception.
        </p>
      </div>
    </section>
  );
}
