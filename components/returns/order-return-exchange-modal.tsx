"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  MapPin,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/money";
import { ReturnReason, ReturnItemCondition } from "@/constants/status";
import { OrderDTO } from "@/modules/orders/types/order.types";
import { OrderEligibilityResult } from "@/modules/returns/types/return.types";

interface OrderReturnExchangeModalProps {
  order: OrderDTO;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (refNumber: string, isExchange: boolean) => void;
}

export function OrderReturnExchangeModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: OrderReturnExchangeModalProps) {
  const [mode, setMode] = React.useState<"RETURN" | "EXCHANGE">("RETURN");
  const [loadingEligibility, setLoadingEligibility] = React.useState(true);
  const [eligibility, setEligibility] = React.useState<OrderEligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = React.useState<string | null>(null);

  // Return state
  const [selectedItems, setSelectedItems] = React.useState<
    Record<string, { quantity: number; reason: ReturnReason; condition?: ReturnItemCondition }>
  >({});
  const [generalReason, setGeneralReason] = React.useState<ReturnReason>(ReturnReason.WRONG_SIZE);
  const [notes, setNotes] = React.useState("");
  const [evidenceImages, setEvidenceImages] = React.useState<string[]>([]);
  const [evidenceInput, setEvidenceInput] = React.useState("");

  // Exchange state (single item exchange workflow)
  const [exchangeItemId, setExchangeItemId] = React.useState<string>("");
  const [exchangeVariantId, setExchangeVariantId] = React.useState<string>("");
  const [exchangeQuantity, setExchangeQuantity] = React.useState<number>(1);
  const [exchangeVariants, setExchangeVariants] = React.useState<
    Array<{ id: string; size: string; color: string; isAvailable: boolean }>
  >([]);
  const [loadingVariants, setLoadingVariants] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);

  // Fetch eligibility when dialog opens
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadEligibility() {
      setLoadingEligibility(true);
      setEligibilityError(null);
      try {
        const res = await fetch(`/api/account/returns/eligibility/${order.id}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to check return eligibility.");
        }
        if (isMounted) {
          setEligibility(json.data);
          // Pre-select first eligible item
          const firstEligible = json.data.items?.find((i: { isEligible?: boolean }) => i.isEligible);
          if (firstEligible) {
            setSelectedItems({
              [firstEligible.orderItemId]: {
                quantity: 1,
                reason: ReturnReason.WRONG_SIZE,
                condition: ReturnItemCondition.OPENED_UNUSED,
              },
            });
            setExchangeItemId(firstEligible.orderItemId);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setEligibilityError(err instanceof Error ? err.message : "Unable to evaluate eligibility");
        }
      } finally {
        if (isMounted) setLoadingEligibility(false);
      }
    }

    loadEligibility();
    return () => {
      isMounted = false;
    };
  }, [isOpen, order.id]);

  // Handle Return Item Toggle
  const toggleItemSelection = (orderItemId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[orderItemId]) {
        delete copy[orderItemId];
      } else {
        copy[orderItemId] = {
          quantity: 1,
          reason: generalReason,
          condition: ReturnItemCondition.OPENED_UNUSED,
        };
      }
      return copy;
    });
  };

  const updateItemQuantity = (orderItemId: string, quantity: number, maxQty: number) => {
    const q = Math.max(1, Math.min(maxQty, quantity));
    setSelectedItems((prev) => {
      const current = prev[orderItemId] || {
        quantity: 1,
        reason: generalReason,
        condition: ReturnItemCondition.OPENED_UNUSED,
      };
      return {
        ...prev,
        [orderItemId]: {
          ...current,
          quantity: q,
        },
      };
    });
  };

  const updateItemReason = (orderItemId: string, reason: ReturnReason) => {
    setSelectedItems((prev) => {
      const current = prev[orderItemId] || {
        quantity: 1,
        reason: generalReason,
        condition: ReturnItemCondition.OPENED_UNUSED,
      };
      return {
        ...prev,
        [orderItemId]: {
          ...current,
          reason,
        },
      };
    });
  };

  const addEvidenceImage = () => {
    if (!evidenceInput.trim()) return;
    try {
      new URL(evidenceInput.trim());
      if (!evidenceImages.includes(evidenceInput.trim())) {
        setEvidenceImages([...evidenceImages, evidenceInput.trim()]);
      }
      setEvidenceInput("");
    } catch {
      setSubmissionError("Please provide a valid image URL (e.g. https://...)");
    }
  };

  const removeEvidenceImage = (idx: number) => {
    setEvidenceImages(evidenceImages.filter((_, i) => i !== idx));
  };

  // Submit return or exchange
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmissionError(null);

    try {
      if (mode === "RETURN") {
        const items = Object.entries(selectedItems).map(([orderItemId, config]) => ({
          orderItemId,
          quantity: config.quantity,
          reason: config.reason,
          condition: config.condition,
        }));

        if (items.length === 0) {
          throw new Error("Please select at least one garment item to return.");
        }

        const res = await fetch("/api/account/returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            reason: generalReason,
            description: notes,
            evidenceImages,
            items,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to create return request.");
        }

        onSuccess(json.data.returnNumber, false);
      } else {
        // Mode === "EXCHANGE"
        if (!exchangeItemId) {
          throw new Error("Please select an item to exchange.");
        }
        if (!exchangeVariantId) {
          throw new Error("Please select a replacement size or color variant.");
        }

        const res = await fetch("/api/account/exchanges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            originalOrderItemId: exchangeItemId,
            requestedVariantId: exchangeVariantId,
            quantity: exchangeQuantity,
            reason: generalReason,
            description: notes,
            evidenceImages,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to create exchange request.");
        }

        onSuccess(json.data.exchangeNumber, true);
      }
    } catch (err: unknown) {
      setSubmissionError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-modal-title"
        className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 md:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-primary">VÉRONA Concierge</span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                Phase 22 Returns & Exchanges
              </Badge>
            </div>
            <h2 id="return-modal-title" className="font-serif text-xl font-medium text-foreground mt-1">
              Order {order.orderNumber}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select bespoke garments to initiate reverse logistics pickup or size exchange.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loadingEligibility && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-xs font-mono">Evaluating return window & atelier eligibility...</p>
          </div>
        )}

        {eligibilityError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Return Ineligible</p>
              <p>{eligibilityError}</p>
            </div>
          </div>
        )}

        {!loadingEligibility && eligibility && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-lg border border-border p-1 bg-neutral-100 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setMode("RETURN")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono uppercase tracking-wider rounded transition ${
                  mode === "RETURN"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return for Refund
              </button>
              <button
                type="button"
                onClick={() => setMode("EXCHANGE")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono uppercase tracking-wider rounded transition ${
                  mode === "EXCHANGE"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Garment Size Exchange
              </button>
            </div>

            {/* Policy & Window Banner */}
            <div className="rounded-lg border border-border/60 bg-neutral-50 dark:bg-neutral-900/50 p-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Return Window: <strong className="text-foreground">{eligibility.returnWindowDays} Days</strong> from delivery
                </span>
              </div>
              {eligibility.windowExpiresAt && (
                <span className="font-mono text-[11px]">
                  Valid until {new Date(eligibility.windowExpiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Garments Items Selection */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                Select Garments for {mode === "RETURN" ? "Return" : "Exchange"}
              </label>

              <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden bg-background">
                {eligibility.items.map((item) => {
                  const isSelected = Boolean(selectedItems[item.orderItemId]);

                  return (
                    <div
                      key={item.orderItemId}
                      className={`p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        !item.isEligible ? "opacity-50 bg-neutral-50/50 dark:bg-neutral-900/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type={mode === "RETURN" ? "checkbox" : "radio"}
                          name="return_item_select"
                          disabled={!item.isEligible}
                          checked={mode === "RETURN" ? isSelected : exchangeItemId === item.orderItemId}
                          onChange={() => {
                            if (mode === "RETURN") {
                              toggleItemSelection(item.orderItemId, item.remainingReturnableQuantity);
                            } else {
                              setExchangeItemId(item.orderItemId);
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />

                        <div className="space-y-0.5">
                          <p className="text-xs font-serif font-medium text-foreground">
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>Purchased: {item.orderedQuantity}</span>
                            <span>•</span>
                            <span>Remaining: <strong className="text-foreground">{item.remainingReturnableQuantity}</strong></span>
                            <span>•</span>
                            <span className="font-mono">{formatMoney(item.unitPriceMinor)}</span>
                          </div>

                          {!item.isEligible && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                              Ineligible: {item.ineligibleReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Reason Controls when selected */}
                      {mode === "RETURN" && isSelected && (
                        <div className="flex items-center gap-3 pl-7 sm:pl-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-mono">Qty:</span>
                            <input
                              type="number"
                              min={1}
                              max={item.remainingReturnableQuantity}
                              value={selectedItems[item.orderItemId]?.quantity || 1}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.orderItemId,
                                  parseInt(e.target.value, 10) || 1,
                                  item.remainingReturnableQuantity
                                )
                              }
                              className="w-14 rounded border border-border bg-background px-2 py-1 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <select
                            value={selectedItems[item.orderItemId]?.reason || generalReason}
                            onChange={(e) =>
                              updateItemReason(item.orderItemId, e.target.value as ReturnReason)
                            }
                            className="rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value={ReturnReason.WRONG_SIZE}>Wrong Size / Fit</option>
                            <option value={ReturnReason.WRONG_COLOR}>Color Not As Expected</option>
                            <option value={ReturnReason.WRONG_PRODUCT}>Wrong Item Delivered</option>
                            <option value={ReturnReason.DAMAGED}>Transit Damage</option>
                            <option value={ReturnReason.DEFECTIVE}>Manufacturing Defect</option>
                            <option value={ReturnReason.QUALITY_ISSUE}>Quality Not Expected</option>
                            <option value={ReturnReason.CHANGED_MIND}>Changed My Mind</option>
                            <option value={ReturnReason.OTHER}>Other Reason</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exchange Replacement Selection (Only in Exchange Mode) */}
            {mode === "EXCHANGE" && (
              <div className="space-y-3 rounded-lg border border-border/80 bg-neutral-50/50 dark:bg-neutral-900/30 p-4">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Select Replacement Size & Color
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Replacement Variant ID / SKU</span>
                    <input
                      type="text"
                      placeholder="e.g. Size L or alternate color SKU"
                      value={exchangeVariantId}
                      onChange={(e) => setExchangeVariantId(e.target.value)}
                      required
                      className="w-full rounded border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Exchange Reason</span>
                    <select
                      value={generalReason}
                      onChange={(e) => setGeneralReason(e.target.value as ReturnReason)}
                      className="w-full rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={ReturnReason.WRONG_SIZE}>Requires Different Size</option>
                      <option value={ReturnReason.WRONG_COLOR}>Requires Alternate Color</option>
                      <option value={ReturnReason.DEFECTIVE}>Defective - Needs Replacement</option>
                      <option value={ReturnReason.DAMAGED}>Damaged - Needs Replacement</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Pickup Destination Confirmation */}
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Reverse Logistics Pickup Location</span>
              </div>
              <p className="text-xs text-foreground font-semibold">
                {order.shippingAddress.fullName} — {order.shippingAddress.phone}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.shippingAddress.addressLine1},{" "}
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific fit feedback or notes for our atelier concierge..."
                rows={2}
                maxLength={500}
                className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Optional Photo Evidence */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                Photo Evidence (Optional for damage/defect claims)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={evidenceInput}
                  onChange={(e) => setEvidenceInput(e.target.value)}
                  className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEvidenceImage}
                  className="text-xs"
                >
                  Add Photo
                </Button>
              </div>

              {evidenceImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {evidenceImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-[11px] text-muted-foreground font-mono"
                    >
                      <span className="truncate max-w-[180px]">{img}</span>
                      <button
                        type="button"
                        onClick={() => removeEvidenceImage(idx)}
                        className="hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submissionError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {submissionError}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={onClose}
                className="text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <span>Confirm {mode === "RETURN" ? "Return" : "Exchange"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
