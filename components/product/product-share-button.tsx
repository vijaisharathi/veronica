"use client";

import * as React from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ProductShareButtonProps {
  title: string;
  slug: string;
  className?: string;
}

/**
 * VÉRONA — Product Share Button
 *
 * Provides native Web Share API on mobile devices and clipboard copy fallback
 * on desktop with visual confirmation feedback. Uses canonical product URL.
 */
export function ProductShareButton({ title, slug, className }: ProductShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const canonicalUrl = `${window.location.origin}/product/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} | VÉRONA`,
          text: `Discover the ${title} at VÉRONA.`,
          url: canonicalUrl,
        });
        return;
      } catch (err: unknown) {
        // User cancelled or share failed, fallback to clipboard
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleShare}
      className={cn("h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground", className)}
      aria-label={copied ? "Link copied to clipboard" : `Share ${title}`}
      title={copied ? "Link copied!" : "Share garment"}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 mr-1" />
          <span className="text-[11px]">Share</span>
        </>
      )}
    </Button>
  );
}
