import * as React from "react";
import Link from "next/link";
import { Sparkles, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export default function StorefrontNotFound() {
  return (
    <div className="container mx-auto px-4 py-24 min-h-[70vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
            Error 404 • Missing Runway
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl text-foreground font-light tracking-tight">
            Out of Style
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            The collection, garment, or editorial page you are searching for does not exist or has been archived to make way for new season arrivals.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={ROUTES.HOME} className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto text-xs uppercase tracking-wider font-medium">
              <Home className="mr-2 h-3.5 w-3.5" />
              Return Home
            </Button>
          </Link>

          <Link href={ROUTES.NEW_ARRIVALS} className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs uppercase tracking-wider font-medium"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-500" />
              New Arrivals
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
