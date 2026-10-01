"use client";

import * as React from "react";
import {
  Store,
  Shield,
  ToggleLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
} from "lucide-react";
import { SystemSettingsCategory } from "@/constants/status";
import { AdminSystemSettingDTO } from "@/modules/admin/types/admin-management.types";
import { Button } from "@/components/ui/button";

export function AdminPlatformSettingsView() {
  const [settings, setSettings] = React.useState<AdminSystemSettingDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<"STORE" | "MAINTENANCE" | "FEATURE_FLAGS">("STORE");

  // Form states initialized with standard fallbacks
  const [storeForm, setStoreForm] = React.useState({
    storeName: "VÉRONA",
    legalEntityName: "VÉRONA Luxury Retail Pvt. Ltd.",
    supportEmail: "concierge@verona.com",
    supportPhone: "+91 800 837 6621",
    defaultCurrency: "INR",
    defaultLocale: "en-IN",
    defaultTimezone: "Asia/Kolkata",
    storeAddress: {
      line1: "104 Heritage Boulevard, Indiranagar",
      line2: "100 Feet Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      country: "India",
    },
  });

  const [maintenanceForm, setMaintenanceForm] = React.useState({
    enabled: false,
    message: "VÉRONA is briefly undergoing scheduled maintenance. Please visit shortly.",
    allowedIps: [] as string[],
  });

  const [featureFlagsForm, setFeatureFlagsForm] = React.useState({
    enableReviews: true,
    enableWishlist: true,
    enableCouponDiscounts: true,
    enableInternationalShipping: false,
    enableReturnPickupScheduling: true,
  });

  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/settings");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load platform settings");
      }

      const list: AdminSystemSettingDTO[] = json.data;
      setSettings(list);

      const storeSetting = list.find((s) => s.key === "store.info");
      if (storeSetting && storeSetting.value) {
        setStoreForm((prev) => ({ ...prev, ...(storeSetting.value as typeof prev) }));
      }

      const maintSetting = list.find((s) => s.key === "platform.maintenance");
      if (maintSetting && maintSetting.value) {
        setMaintenanceForm((prev) => ({ ...prev, ...(maintSetting.value as typeof prev) }));
      }

      const flagsSetting = list.find((s) => s.key === "platform.feature_flags");
      if (flagsSetting && flagsSetting.value) {
        setFeatureFlagsForm((prev) => ({ ...prev, ...(flagsSetting.value as typeof prev) }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "store.info",
          category: SystemSettingsCategory.STORE,
          value: storeForm,
          description: "Official store identity, localized address, and contact channels",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update store configuration");
      }

      setSuccessMessage("Store identity & localization configuration saved");
      fetchSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaintenanceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "platform.maintenance",
          category: SystemSettingsCategory.MAINTENANCE,
          value: maintenanceForm,
          description: "Platform-wide maintenance mode banner and access controls",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update maintenance settings");
      }

      setSuccessMessage("Maintenance mode configuration saved");
      fetchSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatureFlags = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "platform.feature_flags",
          category: SystemSettingsCategory.FEATURE_FLAGS,
          value: featureFlagsForm,
          description: "Operational feature toggles across customer touchpoints",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update feature toggles");
      }

      setSuccessMessage("Operational feature toggles saved");
      fetchSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Architecture Notice */}
      <div className="p-4 border border-border bg-card rounded-sm flex items-start gap-3.5">
        <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-medium text-foreground">
            Strict Separation of Environment Secrets & Platform Settings
          </p>
          <p className="text-muted-foreground">
            Administrative platform settings manage operational parameters such as store localization, maintenance banners, and module toggles. Cryptographic secrets, payment gateways (Razorpay), authentication keys (Clerk), and transactional email API tokens (Resend) are strictly governed by infrastructure environment variables and cannot be queried or mutated via this interface.
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-sm text-sm text-rose-600 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)} className="ml-auto h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="border-b border-border flex items-center gap-2 text-sm font-mono">
        {[
          { key: "STORE", label: "Store Identity & Localization", icon: Store },
          { key: "MAINTENANCE", label: "Maintenance Mode", icon: Shield },
          { key: "FEATURE_FLAGS", label: "Feature Toggles", icon: ToggleLeft },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveCategory(tab.key as typeof activeCategory);
                setError(null);
                setSuccessMessage(null);
              }}
              className={`pb-3 px-3 flex items-center gap-2 border-b-2 text-xs uppercase tracking-wider transition-colors whitespace-nowrap ${
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading && settings.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground font-mono">
          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
          Loading platform configurations ({settings.length})...
        </div>
      )}

      {/* Store Identity Panel */}
      {activeCategory === "STORE" && (
        <form onSubmit={handleSaveStoreSettings} className="p-6 border border-border bg-card rounded-sm space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-medium text-foreground">
                Storefront Identity & Localization
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure brand presentation, support contact channels, and default localized currencies.
              </p>
            </div>
            <Button size="sm" type="submit" disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Configuration
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">Store Public Name *</label>
              <input
                type="text"
                required
                value={storeForm.storeName}
                onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">Legal Entity Name *</label>
              <input
                type="text"
                required
                value={storeForm.legalEntityName}
                onChange={(e) => setStoreForm({ ...storeForm, legalEntityName: e.target.value })}
                className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">Concierge Support Email *</label>
              <input
                type="email"
                required
                value={storeForm.supportEmail}
                onChange={(e) => setStoreForm({ ...storeForm, supportEmail: e.target.value })}
                className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">Support Helpline *</label>
              <input
                type="text"
                required
                value={storeForm.supportPhone}
                onChange={(e) => setStoreForm({ ...storeForm, supportPhone: e.target.value })}
                className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">Default Currency</label>
              <input
                type="text"
                readOnly
                value={storeForm.defaultCurrency}
                className="w-full p-2 bg-muted/40 border border-border rounded-sm font-mono cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">Default Timezone</label>
              <input
                type="text"
                readOnly
                value={storeForm.defaultTimezone}
                className="w-full p-2 bg-muted/40 border border-border rounded-sm font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-xs font-mono uppercase text-muted-foreground">
              Official Headquarters Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeAddress.line1}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      storeAddress: { ...storeForm.storeAddress, line1: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground">Address Line 2</label>
                <input
                  type="text"
                  value={storeForm.storeAddress.line2 || ""}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      storeAddress: { ...storeForm.storeAddress, line2: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground">City *</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeAddress.city}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      storeAddress: { ...storeForm.storeAddress, city: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground">State *</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeAddress.state}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      storeAddress: { ...storeForm.storeAddress, state: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground">Postal Code *</label>
                <input
                  type="text"
                  required
                  value={storeForm.storeAddress.postalCode}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      storeAddress: { ...storeForm.storeAddress, postalCode: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground">Country</label>
                <input
                  type="text"
                  readOnly
                  value={storeForm.storeAddress.country}
                  className="w-full p-2 bg-muted/40 border border-border rounded-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Maintenance Mode Panel */}
      {activeCategory === "MAINTENANCE" && (
        <form onSubmit={handleSaveMaintenanceSettings} className="p-6 border border-border bg-card rounded-sm space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-medium text-foreground">
                Platform Maintenance Controls
              </h3>
              <p className="text-xs text-muted-foreground">
                Temporarily pause public storefront traffic while keeping administrative access intact.
              </p>
            </div>
            <Button size="sm" type="submit" disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Maintenance State
            </Button>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-center gap-3 p-3 border border-border rounded-sm bg-background cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceForm.enabled}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, enabled: e.target.checked })}
                className="rounded-xs text-primary h-4 w-4"
              />
              <div>
                <span className="font-medium text-foreground block">
                  Enable Maintenance Mode
                </span>
                <span className="text-muted-foreground text-[11px]">
                  When active, non-staff visitors will see the maintenance message banner below.
                </span>
              </div>
            </label>

            <div className="space-y-1">
              <label className="font-mono uppercase text-muted-foreground">
                Public Maintenance Notice
              </label>
              <textarea
                value={maintenanceForm.message}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, message: e.target.value })}
                rows={3}
                className="w-full p-2.5 bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </form>
      )}

      {/* Feature Toggles Panel */}
      {activeCategory === "FEATURE_FLAGS" && (
        <form onSubmit={handleSaveFeatureFlags} className="p-6 border border-border bg-card rounded-sm space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-medium text-foreground">
                Operational Feature Flags
              </h3>
              <p className="text-xs text-muted-foreground">
                Enable or disable commerce capabilities across customer touchpoints.
              </p>
            </div>
            <Button size="sm" type="submit" disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Feature Toggles
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: "enableReviews",
                label: "Client Reviews & Ratings System",
                desc: "Allows customers to submit verified buyer reviews and browse product feedback.",
                checked: featureFlagsForm.enableReviews,
              },
              {
                key: "enableWishlist",
                label: "Customer Wishlist Module",
                desc: "Allows authenticated customers to save luxury pieces to personal lookbooks.",
                checked: featureFlagsForm.enableWishlist,
              },
              {
                key: "enableCouponDiscounts",
                label: "Promotional Coupons & Vouchers",
                desc: "Enables coupon validation, code entry in checkout, and automatic discounts.",
                checked: featureFlagsForm.enableCouponDiscounts,
              },
              {
                key: "enableReturnPickupScheduling",
                label: "Automated Return Pickup Scheduling",
                desc: "Permits clients to schedule courier doorstep return pickups during returns.",
                checked: featureFlagsForm.enableReturnPickupScheduling,
              },
              {
                key: "enableInternationalShipping",
                label: "Cross-Border International Delivery",
                desc: "Allows serviceability checking and shipping outside domestic India.",
                checked: featureFlagsForm.enableInternationalShipping,
              },
            ].map((flag) => (
              <label
                key={flag.key}
                className="flex items-start gap-3 p-3.5 border border-border rounded-sm bg-background cursor-pointer hover:bg-muted/10 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={flag.checked}
                  onChange={(e) =>
                    setFeatureFlagsForm({
                      ...featureFlagsForm,
                      [flag.key]: e.target.checked,
                    })
                  }
                  className="rounded-xs text-primary mt-0.5"
                />
                <div>
                  <span className="font-medium text-foreground block">{flag.label}</span>
                  <span className="text-muted-foreground text-[11px]">{flag.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}
