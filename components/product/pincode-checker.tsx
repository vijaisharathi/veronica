"use client";

import * as React from "react";
import { Truck, CheckCircle2, AlertCircle, MapPin, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryServiceabilityResult, ServiceabilityState } from "@/modules/delivery/delivery.types";

/**
 * VÉRONA — Pincode Serviceability Component
 *
 * Provides customer-facing PIN code input and live serviceability verification
 * against the authoritative `/api/delivery/serviceability` endpoint.
 *
 * States:
 * - IDLE
 * - CHECKING
 * - SERVICEABLE
 * - NOT_SERVICEABLE
 * - INVALID_PINCODE
 * - SERVICEABILITY_UNAVAILABLE
 */
export function PincodeChecker() {
  const [pincode, setPincode] = React.useState("");
  const [state, setState] = React.useState<ServiceabilityState>(ServiceabilityState.UNKNOWN);
  const [result, setResult] = React.useState<DeliveryServiceabilityResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = pincode.trim().replace(/\s+/g, "");

    if (!sanitized) {
      setState(ServiceabilityState.INVALID_PINCODE);
      setErrorMessage("Please enter a 6-digit PIN code.");
      return;
    }

    // Indian PIN codes: 6 numeric digits, non-zero starting digit
    if (!/^[1-9][0-9]{5}$/.test(sanitized)) {
      setState(ServiceabilityState.INVALID_PINCODE);
      setErrorMessage("Please enter a valid 6-digit Indian PIN code (cannot start with 0).");
      return;
    }

    setState(ServiceabilityState.CHECKING);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/delivery/serviceability?postalCode=${encodeURIComponent(sanitized)}`);
      const json = await response.json();

      if (!response.ok || !json.success) {
        if (response.status === 429) {
          setState(ServiceabilityState.SERVICEABILITY_UNAVAILABLE);
          setErrorMessage("Too many checks requested. Please wait a moment.");
          return;
        }
        setState(ServiceabilityState.SERVICEABILITY_UNAVAILABLE);
        setErrorMessage(json?.error?.message || "Delivery serviceability is temporarily unavailable.");
        return;
      }

      const data: DeliveryServiceabilityResult = json.data;
      setResult(data);
      setState(data.state);

      if (!data.serviceable) {
        setErrorMessage(data.reason || "Sorry, delivery is currently unavailable to this PIN code.");
      }
    } catch {
      setState(ServiceabilityState.SERVICEABILITY_UNAVAILABLE);
      setErrorMessage("Network error checking serviceability. Please try again.");
    }
  };

  const isChecking = state === ServiceabilityState.CHECKING;

  return (
    <div className="rounded-lg border border-border bg-neutral-50/60 p-4 space-y-3 dark:bg-neutral-900/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
          <Truck className="h-4 w-4 text-neutral-500" />
          <span>Delivery Options &amp; Services</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          India Shipping
        </span>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
          <input
            id="pincode-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPincode(val);
              if (state !== ServiceabilityState.UNKNOWN) {
                setState(ServiceabilityState.UNKNOWN);
                setResult(null);
                setErrorMessage("");
              }
            }}
            placeholder="Enter 6-digit PIN code"
            aria-label="Enter 6-digit Indian PIN code"
            disabled={isChecking}
            className="h-9 w-full rounded border border-input bg-surface pl-8 pr-3 text-xs tracking-wider font-mono placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:bg-neutral-900 disabled:opacity-60"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          isLoading={isChecking}
          disabled={pincode.length !== 6 || isChecking}
          className="h-9 px-4 text-xs font-medium"
        >
          {isChecking ? "Checking..." : "Check"}
        </Button>
      </form>

      {/* Checking State */}
      {state === ServiceabilityState.CHECKING && (
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
          <span>Checking delivery availability to PIN {pincode}...</span>
        </div>
      )}

      {/* Serviceable State */}
      {state === ServiceabilityState.SERVICEABLE && result && (
        <div className="flex items-start gap-2 pt-1 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Delivery available to PIN {result.postalCode}
              {result.city ? ` (${result.city}${result.stateName ? `, ${result.stateName}` : ""})` : ""}.
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Standard atelier dispatch: estimated arrival within {result.estimatedDeliveryDays ? `${result.estimatedDeliveryDays} business days` : "3–5 business days"}.
            </p>
          </div>
        </div>
      )}

      {/* Not Serviceable State */}
      {state === ServiceabilityState.NOT_SERVICEABLE && (
        <div className="flex items-start gap-2 pt-1 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Delivery unavailable to PIN {pincode}.
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {errorMessage || "Sorry, our courier network does not currently service this delivery location."}
            </p>
          </div>
        </div>
      )}

      {/* Invalid Pincode State */}
      {state === ServiceabilityState.INVALID_PINCODE && (
        <div className="flex items-start gap-2 pt-1 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Serviceability Unavailable / Provider Outage State */}
      {state === ServiceabilityState.SERVICEABILITY_UNAVAILABLE && (
        <div className="flex items-start gap-2 pt-1 text-xs text-neutral-600 dark:text-neutral-400">
          <Info className="h-4 w-4 shrink-0 text-neutral-500 mt-0.5" />
          <p>{errorMessage || "Delivery verification is temporarily unavailable. Please try again."}</p>
        </div>
      )}

      {/* Idle Prompt */}
      {state === ServiceabilityState.UNKNOWN && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Enter your 6-digit postal code to verify regional serviceability across our luxury logistics network.
        </p>
      )}
    </div>
  );
}
