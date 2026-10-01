"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionErrorBoundaryProps {
  sectionName?: string;
  children: React.ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[VÉRONA Storefront] Error in section ${this.props.sectionName || "unnamed"}:`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="container mx-auto px-4 py-8"
          aria-label={`Error loading ${this.props.sectionName || "section"}`}
        >
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border/80 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-3 max-w-md mx-auto">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Unable to load this section
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                We encountered an issue displaying {this.props.sectionName || "these items"}. Please try again.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={this.handleRetry}
              className="text-xs h-8 px-4"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" /> Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
