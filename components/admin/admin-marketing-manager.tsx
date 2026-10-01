"use client";

import * as React from "react";
import {
  Sparkles,
  Plus,
  Play,
  Pause,
  Archive,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CampaignStatus, DiscountType } from "@/constants/status";
import { AdminCampaignDTO } from "@/modules/campaigns/campaign-management.service";
import {
  AdminCategoryListItemDTO,
  AdminCollectionListItemDTO,
  AdminBrandListItemDTO,
} from "@/modules/catalog/admin-catalog.types";

export function AdminMarketingManager() {
  const [campaigns, setCampaigns] = React.useState<AdminCampaignDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Lookups for targeting
  const [categories, setCategories] = React.useState<AdminCategoryListItemDTO[]>([]);
  const [collections, setCollections] = React.useState<AdminCollectionListItemDTO[]>([]);
  const [brands, setBrands] = React.useState<AdminBrandListItemDTO[]>([]);

  // Modal / Form state
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [banner, setBanner] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [priority, setPriority] = React.useState(0);
  const [discountType, setDiscountType] = React.useState<DiscountType>(DiscountType.PERCENTAGE);
  const [discountValue, setDiscountValue] = React.useState(15);
  const [targetCategoryIds, setTargetCategoryIds] = React.useState<string[]>([]);
  const [targetCollectionIds, setTargetCollectionIds] = React.useState<string[]>([]);
  const [targetBrandIds, setTargetBrandIds] = React.useState<string[]>([]);
  const [utmSource, setUtmSource] = React.useState("newsletter");
  const [utmMedium, setUtmMedium] = React.useState("email");
  const [utmCampaign, setUtmCampaign] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchCampaigns = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (data.success && data.data?.campaigns) {
        setCampaigns(data.data.campaigns);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCampaigns();

    async function loadLookups() {
      try {
        const [catRes, colRes, brandRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/collections"),
          fetch("/api/admin/brands"),
        ]);
        const [catData, colData, brandData] = await Promise.all([
          catRes.json(),
          colRes.json(),
          brandRes.json(),
        ]);
        if (catData.data?.categories) setCategories(catData.data.categories);
        if (colData.data?.collections) setCollections(colData.data.collections);
        if (brandData.data?.brands) setBrands(brandData.data.brands);
      } catch (e) {
        console.error("Failed to load targeting lookups", e);
      }
    }
    loadLookups();
  }, [fetchCampaigns]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setBanner("");
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setStartAt(now.toISOString().slice(0, 16));
    setEndAt(nextWeek.toISOString().slice(0, 16));
    setPriority(1);
    setDiscountType(DiscountType.PERCENTAGE);
    setDiscountValue(15);
    setTargetCategoryIds([]);
    setTargetCollectionIds([]);
    setTargetBrandIds([]);
    setUtmSource("marketing");
    setUtmMedium("digital");
    setUtmCampaign("");
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFormError(null);

      if (new Date(endAt) <= new Date(startAt)) {
        throw new Error("End date must be after start date");
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        banner: banner.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        priority: Number(priority),
        discountConfig: {
          type: discountType,
          value: Number(discountValue),
        },
        targetCategoryIds,
        targetCollectionIds,
        targetBrandIds,
        utm: {
          source: utmSource.trim() || undefined,
          medium: utmMedium.trim() || undefined,
          campaign: utmCampaign.trim() || slug.trim() || undefined,
        },
      };

      const url = editingId ? `/api/admin/campaigns/${editingId}` : "/api/admin/campaigns";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to save campaign");
      }

      setShowModal(false);
      await fetchCampaigns();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/campaigns/${id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error?.message || "Failed to activate");
      await fetchCampaigns();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error activating campaign");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/campaigns/${id}/pause`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error?.message || "Failed to pause");
      await fetchCampaigns();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error pausing campaign");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this campaign?")) return;
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive campaign");
      await fetchCampaigns();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error archiving campaign");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground font-normal">Marketing Campaigns</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Orchestrate promotional events, catalog targeting, scheduling windows, and UTM attribution.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Main Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-xs text-muted-foreground">Loading marketing campaigns...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-destructive">{error}</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">No marketing campaigns active</p>
            <p className="text-xs text-muted-foreground">
              Create a promotional campaign to schedule discounts across categories or collections.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Discount Rule</th>
                  <th className="py-2.5 px-3">Targeted Entities</th>
                  <th className="py-2.5 px-3">Schedule Window</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c) => {
                  const isBusy = actionLoading === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <span className="font-medium text-foreground block">{c.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            /{c.slug}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        <span className="text-foreground font-medium">
                          {c.discountConfig.value}
                          {c.discountConfig.type === DiscountType.PERCENTAGE ? "% OFF" : " INR OFF"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5 max-w-xs">
                          {c.targetCategoryNames?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              Categories: {c.targetCategoryNames.join(", ")}
                            </div>
                          )}
                          {c.targetCollectionNames?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              Collections: {c.targetCollectionNames.join(", ")}
                            </div>
                          )}
                          {!c.targetCategoryNames?.length && !c.targetCollectionNames?.length && (
                            <span className="text-[10px] text-muted-foreground/60">
                              Storewide (All Catalog)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        <div>{new Date(c.startAt).toLocaleDateString()}</div>
                        <div>→ {new Date(c.endAt).toLocaleDateString()}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        {c.isCurrentlyActive ? (
                          <Badge variant="default" className="text-[10px] bg-emerald-700">
                            Active Live
                          </Badge>
                        ) : c.status === CampaignStatus.PAUSED ? (
                          <Badge variant="secondary" className="text-[10px] text-amber-500">
                            Paused
                          </Badge>
                        ) : c.status === CampaignStatus.ACTIVE ? (
                          <Badge variant="outline" className="text-[10px] text-blue-500">
                            Scheduled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {c.status}
                          </Badge>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {c.status === CampaignStatus.ACTIVE ? (
                            <button
                              onClick={() => handlePause(c.id)}
                              disabled={isBusy}
                              title="Pause Campaign"
                              className="p-1.5 hover:text-amber-500 hover:bg-muted rounded-sm transition-colors"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(c.id)}
                              disabled={isBusy}
                              title="Activate Campaign"
                              className="p-1.5 hover:text-emerald-500 hover:bg-muted rounded-sm transition-colors"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleArchive(c.id)}
                            disabled={isBusy}
                            title="Archive Campaign"
                            className="p-1.5 hover:text-destructive hover:bg-muted rounded-sm transition-colors"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-sm max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-border pb-3">
              <h2 className="font-serif text-lg font-normal text-foreground">
                {editingId ? "Edit Campaign" : "Create Marketing Campaign"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Configures promotional scheduling, targeted categories, and UTM parameters.
              </p>
            </div>

            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Season Private Privilege"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)+/g, "")
                      );
                    }
                  }}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Slug</label>
                <input
                  type="text"
                  placeholder="mid-season-private-privilege"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                />
              </div>

              {/* Discount Config */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-foreground font-medium mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5"
                  >
                    <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
                    <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Start Date / Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">End Date / Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]"
                  />
                </div>
              </div>

              {/* Target Categories */}
              <div>
                <label className="block text-foreground font-medium mb-1">Target Categories</label>
                <div className="max-h-24 overflow-y-auto border border-border rounded-sm p-1.5 space-y-1 bg-background">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetCategoryIds.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) setTargetCategoryIds((prev) => [...prev, cat.id]);
                          else setTargetCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                        }}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Collections & Brands */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-foreground font-medium mb-1">Target Collections</label>
                  <div className="max-h-24 overflow-y-auto border border-border rounded-sm p-1.5 space-y-1 bg-background">
                    {collections.map((col) => (
                      <label key={col.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={targetCollectionIds.includes(col.id)}
                          onChange={(e) => {
                            if (e.target.checked) setTargetCollectionIds((prev) => [...prev, col.id]);
                            else setTargetCollectionIds((prev) => prev.filter((id) => id !== col.id));
                          }}
                        />
                        <span>{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">Target Brands</label>
                  <div className="max-h-24 overflow-y-auto border border-border rounded-sm p-1.5 space-y-1 bg-background">
                    {brands.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={targetBrandIds.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) setTargetBrandIds((prev) => [...prev, b.id]);
                            else setTargetBrandIds((prev) => prev.filter((id) => id !== b.id));
                          }}
                        />
                        <span>{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* UTM Attribution */}
              <div className="border border-border/80 rounded-sm p-2.5 bg-muted/10 space-y-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block">
                  UTM Attribution Tags
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block">Source</label>
                    <input
                      type="text"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block">Medium</label>
                    <input
                      type="text"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block">Campaign</label>
                    <input
                      type="text"
                      value={utmCampaign}
                      placeholder={slug || "campaign"}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[10px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="gap-2">
                  {saving && <Spinner className="h-3.5 w-3.5" />}
                  {editingId ? "Update Campaign" : "Schedule Campaign"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
