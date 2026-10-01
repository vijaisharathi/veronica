"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  Smartphone,
  Check,
  AlertCircle,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { NotificationPreferenceDTO } from "@/modules/notifications/types/notification.types";

export function NotificationPreferencesView() {
  const [preferences, setPreferences] = React.useState<NotificationPreferenceDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchPreferences = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/notification-preferences");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPreferences(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load preferences", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = (key: keyof NotificationPreferenceDTO) => {
    if (!preferences) return;
    if (key === "securityAlerts") {
      // Invariant: Cannot toggle security alerts
      return;
    }

    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/account/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: preferences.email,
          sms: preferences.sms,
          push: preferences.push,
          whatsapp: preferences.whatsapp,
          inApp: preferences.inApp,
          orderUpdates: preferences.orderUpdates,
          paymentUpdates: preferences.paymentUpdates,
          shippingUpdates: preferences.shippingUpdates,
          returnRefundUpdates: preferences.returnRefundUpdates,
          reviewUpdates: preferences.reviewUpdates,
          marketing: preferences.marketing,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPreferences(json.data);
        setSuccessMessage("Your atelier notification preferences have been saved.");
      } else {
        setErrorMessage(json.error?.message || "Failed to update preferences.");
      }
    } catch {
      setErrorMessage("Network error saving communication preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-stone-400 animate-pulse">
          Loading atelier communication preferences...
        </p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-stone-600">Unable to load communication settings.</p>
        <button
          onClick={fetchPreferences}
          className="mt-4 px-4 py-2 text-xs uppercase tracking-wider bg-stone-900 text-stone-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <Link
          href="/account/notifications"
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 uppercase tracking-widest mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Notification Center
        </Link>
        <h1 className="text-2xl font-serif tracking-tight text-stone-900">
          Communication Preferences
        </h1>
        <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">
          Customize your channel subscriptions and transaction alerts
        </p>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-stone-100 border border-stone-300 text-stone-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-stone-900" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Channels */}
      <div className="bg-white border border-stone-200 p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900">
            Delivery Channels
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Select the communication mediums through which you wish to receive updates.
          </p>
        </div>

        <div className="divide-y divide-stone-100">
          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-stone-700" />
              <div>
                <p className="text-sm font-medium text-stone-900">Email Dispatches</p>
                <p className="text-xs text-stone-500">
                  Receive luxury formatted receipts, packing confirmations, and waybills.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={() => handleToggle("email")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-stone-700" />
              <div>
                <p className="text-sm font-medium text-stone-900">SMS / Text Alerts</p>
                <p className="text-xs text-stone-500">
                  Immediate dispatch updates to your registered phone number.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.sms}
              onChange={() => handleToggle("sms")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-stone-700" />
              <div>
                <p className="text-sm font-medium text-stone-900">In-App Notification Center</p>
                <p className="text-xs text-stone-500">
                  Display status updates in your client account portal header.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.inApp}
              onChange={() => handleToggle("inApp")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>
        </div>
      </div>

      {/* Section 2: Categories */}
      <div className="bg-white border border-stone-200 p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900">
            Notification Categories
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Fine-tune the lifecycle events you wish to be alerted about.
          </p>
        </div>

        <div className="divide-y divide-stone-100">
          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-900">Order Updates</p>
              <p className="text-xs text-stone-500">
                Garment preparation, atelier inspection, and order confirmations.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.orderUpdates}
              onChange={() => handleToggle("orderUpdates")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-900">Shipping & Delivery</p>
              <p className="text-xs text-stone-500">
                Courier dispatch, tracking numbers, and delivery completion.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.shippingUpdates}
              onChange={() => handleToggle("shippingUpdates")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-900">Payment & Invoices</p>
              <p className="text-xs text-stone-500">
                Verification receipts, invoices, and authorization notices.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.paymentUpdates}
              onChange={() => handleToggle("paymentUpdates")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-900">Returns & Refunds</p>
              <p className="text-xs text-stone-500">
                Return authorizations, pickup bookings, and refund settlements.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.returnRefundUpdates}
              onChange={() => handleToggle("returnRefundUpdates")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-900">Reviews & Ratings</p>
              <p className="text-xs text-stone-500">
                Notices when your verified feedback is approved and published.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.reviewUpdates}
              onChange={() => handleToggle("reviewUpdates")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>

          {/* Security alerts: Immutable mandatory policy */}
          <div className="py-4 flex items-center justify-between bg-stone-50/70 p-3 border border-stone-200">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-stone-500" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-900">Security & Authentication</p>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-stone-200 text-stone-700 tracking-wider">
                    Mandatory
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Password changes, security alerts, and new session activity cannot be disabled.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              className="w-4 h-4 accent-stone-900 rounded opacity-60 cursor-not-allowed"
            />
          </div>

          <label className="py-4 flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-stone-900">Atelier Previews & Private Editions</p>
              <p className="text-xs text-stone-500">
                Curated seasonal editorial showcases and bespoke collection launches.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={() => handleToggle("marketing")}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-xs font-semibold uppercase tracking-widest bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving Preferences..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
