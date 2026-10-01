"use client";

import * as React from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Archive,
  CheckCircle,
  XCircle,
  MoreVertical,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ProductStatus } from "@/constants/status";
import { AdminProductListItemDTO } from "@/modules/catalog/admin-catalog.types";

export function AdminProductsTable() {
  const [products, setProducts] = React.useState<AdminProductListItemDTO[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = React.useState(false);

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load products");
      }
      const data = await res.json();
      if (data.success && data.data) {
        setProducts(data.data.products);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading products");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePublishToggle = async (id: string, currentStatus: ProductStatus) => {
    try {
      setActionLoading(id);
      const endpoint =
        currentStatus === ProductStatus.PUBLISHED
          ? `/api/admin/products/${id}/unpublish`
          : `/api/admin/products/${id}/publish`;

      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Operation failed");
      }
      await fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this product?")) return;
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to archive product");
      }
      await fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: "PUBLISH" | "UNPUBLISH" | "ARCHIVE") => {
    if (selectedIds.length === 0) return;
    if (action === "ARCHIVE" && !confirm(`Archive ${selectedIds.length} selected products?`)) return;

    try {
      setBulkProcessing(true);
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, productIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Bulk operation failed");
      }
      setSelectedIds([]);
      await fetchProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const formatPrice = (minor: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground font-normal">Products</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage garment styles, publication status, inventory references, and variants.
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Garment Product
          </Button>
        </Link>
      </div>

      {/* Filter and Bulk Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-card border border-border p-3 rounded-sm">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title, SKU, or slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border rounded-sm pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-background border border-border rounded-sm px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value={ProductStatus.PUBLISHED}>Published</option>
            <option value={ProductStatus.DRAFT}>Draft</option>
            <option value={ProductStatus.ARCHIVED}>Archived</option>
          </select>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-3">
            <span className="text-xs font-mono text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("PUBLISH")}
              disabled={bulkProcessing}
              className="text-xs h-7 px-2"
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("UNPUBLISH")}
              disabled={bulkProcessing}
              className="text-xs h-7 px-2"
            >
              Unpublish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("ARCHIVE")}
              disabled={bulkProcessing}
              className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
            >
              Archive
            </Button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-xs text-muted-foreground">Loading catalog products...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-destructive">{error}</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">No products found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search criteria or create a new garment product.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Brand & Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Price Range</th>
                  <th className="py-2.5 px-3">Variants / Stock</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isBusy = actionLoading === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(product.id)}
                          className="rounded border-border"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {product.primaryImage ? (
                            <img
                              src={product.primaryImage}
                              alt={product.name}
                              className="h-10 w-8 object-cover rounded-sm border border-border"
                            />
                          ) : (
                            <div className="h-10 w-8 bg-muted rounded-sm border border-border flex items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors block text-xs"
                            >
                              {product.name}
                            </Link>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              /{product.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="text-foreground block">{product.brandName || "—"}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {product.categoryNames?.join(", ") || "Uncategorized"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {product.status === ProductStatus.PUBLISHED ? (
                          <Badge variant="default" className="text-[10px] bg-emerald-700">
                            Published
                          </Badge>
                        ) : product.status === ProductStatus.ARCHIVED ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Draft
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {product.priceRange ? product.priceRange.formatted : "—"}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="space-y-0.5">
                          <span>{product.variantCount} variant(s)</span>
                          <span
                            className={`text-[10px] block ${
                              product.totalStock > 0 ? "text-muted-foreground" : "text-destructive"
                            }`}
                          >
                            {product.totalStock} in stock
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={`/api/admin/products/${product.id}/preview`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview Storefront View"
                            className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>

                          <Link
                            href={`/admin/products/${product.id}`}
                            title="Edit Product"
                            className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          {product.status === ProductStatus.PUBLISHED ? (
                            <button
                              onClick={() => handlePublishToggle(product.id, product.status)}
                              disabled={isBusy}
                              title="Unpublish"
                              className="p-1.5 hover:text-amber-500 hover:bg-muted rounded-sm transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublishToggle(product.id, product.status)}
                              disabled={isBusy}
                              title="Publish"
                              className="p-1.5 hover:text-emerald-500 hover:bg-muted rounded-sm transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {product.status !== ProductStatus.ARCHIVED && (
                            <button
                              onClick={() => handleArchive(product.id)}
                              disabled={isBusy}
                              title="Archive"
                              className="p-1.5 hover:text-destructive hover:bg-muted rounded-sm transition-colors"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing {products.length} of {total} products
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs px-2.5"
              >
                Previous
              </Button>
              <span className="font-mono text-xs">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
