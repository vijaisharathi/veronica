"use client";

import * as React from "react";
import { Boxes, Plus, Edit, Archive, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AdminCollectionListItemDTO } from "@/modules/catalog/admin-catalog.types";

export function AdminCollectionsManager() {
  const [collections, setCollections] = React.useState<AdminCollectionListItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [heroImage, setHeroImage] = React.useState("");
  const [banner, setBanner] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchCollections = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/collections");
      if (!res.ok) throw new Error("Failed to load collections");
      const data = await res.json();
      if (data.success && data.data?.collections) {
        setCollections(data.data.collections);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching collections");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setHeroImage("");
    setBanner("");
    setActive(true);
    setStartDate("");
    setEndDate("");
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: AdminCollectionListItemDTO) => {
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || "");
    setHeroImage(c.heroImage || "");
    setBanner(c.banner || "");
    setActive(c.active);
    setStartDate(c.startDate ? c.startDate.slice(0, 16) : "");
    setEndDate(c.endDate ? c.endDate.slice(0, 16) : "");
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        heroImage: heroImage.trim() || undefined,
        banner: banner.trim() || undefined,
        active,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      const url = editingId ? `/api/admin/collections/${editingId}` : "/api/admin/collections";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to save collection");
      }

      setShowModal(false);
      await fetchCollections();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, colName: string) => {
    if (!confirm(`Are you sure you want to archive collection '${colName}'?`)) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Cannot archive collection");
      }
      await fetchCollections();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground font-normal">Fashion Collections</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Curate thematic seasonal capsules, campaign showcases, and product membership rules.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* Main Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-xs text-muted-foreground">Loading collections...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-destructive">{error}</div>
        ) : collections.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Boxes className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">No collections created</p>
            <p className="text-xs text-muted-foreground">
              Create a seasonal capsule like &ldquo;Winter Cashmere 2026&rdquo; or &ldquo;Resort Minimalist&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Collection</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3">Schedule Window</th>
                  <th className="py-2.5 px-3">Member Products</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {collections.map((col) => (
                  <tr key={col.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3">
                        {col.heroImage ? (
                          <img
                            src={col.heroImage}
                            alt={col.name}
                            className="h-10 w-12 object-cover rounded-sm border border-border"
                          />
                        ) : (
                          <div className="h-10 w-12 bg-muted rounded-sm border border-border flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-foreground block">{col.name}</span>
                          {col.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">
                              {col.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                      /collections/{col.slug}
                    </td>

                    <td className="py-2.5 px-3 text-[11px] font-mono text-muted-foreground">
                      {col.startDate || col.endDate ? (
                        <div className="space-y-0.5">
                          <span>{col.startDate ? new Date(col.startDate).toLocaleDateString() : "Immediate"}</span>
                          <span> → </span>
                          <span>{col.endDate ? new Date(col.endDate).toLocaleDateString() : "Indefinite"}</span>
                        </div>
                      ) : (
                        <span>Always Active</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <span className="text-foreground">{col.productCount}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">products</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {col.active ? (
                        <Badge variant="default" className="text-[10px] bg-emerald-700">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Hidden
                        </Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(col)}
                          title="Edit Collection"
                          className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(col.id, col.name)}
                          title="Archive Collection"
                          className="p-1.5 hover:text-destructive hover:bg-muted rounded-sm transition-colors"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b border-border pb-3">
              <h2 className="font-serif text-lg font-normal text-foreground">
                {editingId ? "Edit Collection" : "Create New Collection"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Configures seasonal capsules, hero photography, and active schedule.
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
                <label className="block text-foreground font-medium mb-1">Collection Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Cashmere 2026"
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
                  placeholder="winter-cashmere-2026"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Thematic editorial notes for this collection..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Hero Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Start Date / Time</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">End Date / Time</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="col-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="col-active" className="cursor-pointer text-foreground">
                  Active & Display on Storefront
                </label>
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
                  {editingId ? "Update Collection" : "Create Collection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
