"use client";

import * as React from "react";
import { Bookmark, Plus, Edit, Archive, AlertCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AdminBrandListItemDTO } from "@/modules/catalog/admin-catalog.types";

export function AdminBrandsManager() {
  const [brands, setBrands] = React.useState<AdminBrandListItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [banner, setBanner] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchBrands = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/brands");
      if (!res.ok) throw new Error("Failed to load brands");
      const data = await res.json();
      if (data.success && data.data?.brands) {
        setBrands(data.data.brands);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching brands");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setLogo("");
    setBanner("");
    setWebsite("");
    setActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (b: AdminBrandListItemDTO) => {
    setEditingId(b.id);
    setName(b.name);
    setSlug(b.slug);
    setDescription(b.description || "");
    setLogo(b.logo || "");
    setBanner(b.banner || "");
    setWebsite(b.website || "");
    setActive(b.active);
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
        logo: logo.trim() || undefined,
        banner: banner.trim() || undefined,
        website: website.trim() || undefined,
        active,
      };

      const url = editingId ? `/api/admin/brands/${editingId}` : "/api/admin/brands";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to save brand");
      }

      setShowModal(false);
      await fetchBrands();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, brandName: string) => {
    if (!confirm(`Are you sure you want to archive brand '${brandName}'?`)) return;
    try {
      const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Cannot archive brand");
      }
      await fetchBrands();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground font-normal">Brands</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage fashion houses, labels, logos, and verified brand partnerships.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Brand
        </Button>
      </div>

      {/* Main Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-xs text-muted-foreground">Loading brands...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-destructive">{error}</div>
        ) : brands.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bookmark className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">No brands registered</p>
            <p className="text-xs text-muted-foreground">
              Register fashion labels like &ldquo;VÉRONA Atelier&rdquo;, &ldquo;Loro Piana&rdquo;, etc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3">Website</th>
                  <th className="py-2.5 px-3">Products</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {brands.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3">
                        {b.logo ? (
                          <img
                            src={b.logo}
                            alt={b.name}
                            className="h-8 w-8 object-contain rounded-full border border-border bg-background p-1"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded-full border border-border flex items-center justify-center text-muted-foreground">
                            <Bookmark className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-foreground block">{b.name}</span>
                          {b.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">
                              {b.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                      /brands/{b.slug}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                      {b.website ? (
                        <a
                          href={b.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          <span>{new URL(b.website).hostname}</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <span className="text-foreground">{b.productCount}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">products</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {b.active ? (
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
                          onClick={() => handleOpenEdit(b)}
                          title="Edit Brand"
                          className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(b.id, b.name)}
                          title="Archive Brand"
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
                {editingId ? "Edit Brand" : "Register Brand"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Configures brand identity, emblem logo, and active partnership status.
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
                <label className="block text-foreground font-medium mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VÉRONA Atelier"
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
                  placeholder="verona-atelier"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Logo URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Official Website</label>
                <input
                  type="url"
                  placeholder="https://brand.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Heritage and craftsmanship background..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brand-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="brand-active" className="cursor-pointer text-foreground">
                  Active Brand
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
                  {editingId ? "Update Brand" : "Register Brand"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
