"use client";

import * as React from "react";
import {
  Layers,
  Plus,
  Edit,
  Archive,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AdminCategoryListItemDTO } from "@/modules/catalog/admin-catalog.types";

export function AdminCategoriesManager() {
  const [categories, setCategories] = React.useState<AdminCategoryListItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [active, setActive] = React.useState(true);
  const [sortOrder, setSortOrder] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchCategories = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      if (data.success && data.data?.categories) {
        setCategories(data.data.categories);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching categories");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setParentId("");
    setActive(true);
    setSortOrder(categories.length);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: AdminCategoryListItemDTO) => {
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || "");
    setParentId(c.parentId || "");
    setActive(c.active);
    setSortOrder(c.sortOrder);
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
        parentId: parentId || null,
        active,
        sortOrder: Number(sortOrder),
      };

      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to save category");
      }

      setShowModal(false);
      await fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to archive category '${catName}'?`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Cannot archive category");
      }
      await fetchCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setCategories(reordered);

    try {
      await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
    } catch (err) {
      console.error("Reorder sync error", err);
      await fetchCategories();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground font-normal">Categories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage category hierarchy, sort ordering, product associations, and cycle protection.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      {/* Main Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-xs text-muted-foreground">Loading category hierarchy...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-destructive">{error}</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">No categories defined</p>
            <p className="text-xs text-muted-foreground">
              Create your primary category taxonomy to organize garments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-16">Order</th>
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3">Parent Hierarchy</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3">Products</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, "up")}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => handleMove(idx, "down")}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {cat.parentId ? (
                          <span className="text-muted-foreground font-mono text-[10px] pl-2">↳</span>
                        ) : (
                          <FolderTree className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-muted-foreground">
                      {cat.parentName ? (
                        <Badge variant="outline" className="text-[10px]">
                          {cat.parentName}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">Top-Level Root</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                      /{cat.slug}
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <span className="text-foreground">{cat.productCount}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">items</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {cat.active ? (
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
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
                          className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(cat.id, cat.name)}
                          title="Archive Category"
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
                {editingId ? "Edit Category" : "Create New Category"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Defines hierarchical taxonomy and storefront navigation rules.
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
                <label className="block text-foreground font-medium mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tailored Outerwear"
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
                  placeholder="tailored-outerwear"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Parent Category</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5"
                >
                  <option value="">None (Top-Level Root Category)</option>
                  {categories
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Luxury craftsmanship notes for this category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="cat-active" className="cursor-pointer text-foreground">
                  Active & Discoverable on Storefront
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
                  {editingId ? "Update Category" : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
