"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ProductStatus, Gender } from "@/constants/status";
import {
  AdminProductDetailDTO,
  AdminCategoryListItemDTO,
  AdminCollectionListItemDTO,
  AdminBrandListItemDTO,
} from "@/modules/catalog/admin-catalog.types";

interface AdminProductFormProps {
  initialData?: AdminProductDetailDTO;
  isEditing?: boolean;
}

export function AdminProductForm({ initialData, isEditing = false }: AdminProductFormProps) {
  const router = useRouter();

  // Basic Information
  const [title, setTitle] = React.useState(initialData?.name || "");
  const [slug, setSlug] = React.useState(initialData?.slug || "");
  const [description, setDescription] = React.useState(initialData?.description || "");
  const [gender, setGender] = React.useState<Gender>(initialData?.gender || Gender.UNISEX);
  const [status, setStatus] = React.useState<ProductStatus>(
    initialData?.status || ProductStatus.DRAFT
  );

  // References
  const [brandId, setBrandId] = React.useState<string>(initialData?.brandId || "");
  const [categoryIds, setCategoryIds] = React.useState<string[]>(initialData?.categoryIds || []);
  const [collectionIds, setCollectionIds] = React.useState<string[]>(
    initialData?.collectionIds || []
  );

  // Loaded Options
  const [brands, setBrands] = React.useState<AdminBrandListItemDTO[]>([]);
  const [categories, setCategories] = React.useState<AdminCategoryListItemDTO[]>([]);
  const [collections, setCollections] = React.useState<AdminCollectionListItemDTO[]>([]);

  // Attributes
  const [fabric, setFabric] = React.useState(initialData?.fabric || "");
  const [pattern, setPattern] = React.useState(initialData?.pattern || "");
  const [fit, setFit] = React.useState(initialData?.fit || "");
  const [neck, setNeck] = React.useState(
    initialData?.specifications?.find((s) => s.key.toLowerCase() === "neck")?.value || ""
  );
  const [sleeve, setSleeve] = React.useState(
    initialData?.specifications?.find((s) => s.key.toLowerCase() === "sleeve")?.value || ""
  );
  const [occasion, setOccasion] = React.useState(initialData?.occasion || "");
  const [careInstructions, setCareInstructions] = React.useState(
    initialData?.careInstructions?.join("\n") || ""
  );

  // Media
  const [images, setImages] = React.useState<
    Array<{ url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }>
  >(
    initialData?.images?.length
      ? initialData.images
      : [{ url: "", alt: "", isPrimary: true, sortOrder: 0 }]
  );
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [newImageAlt, setNewImageAlt] = React.useState("");

  // Variants
  const [variants, setVariants] = React.useState<
    Array<{
      id?: string;
      sku: string;
      color: { name: string; hex?: string; code?: string };
      size: string;
      mrp: number;
      sellingPrice: number;
      active: boolean;
    }>
  >(
    initialData?.variants?.length
      ? initialData.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          size: typeof v.size === "string" ? v.size : (v.size as unknown as { value?: string })?.value || "S",
          mrp: v.mrp / 100,
          sellingPrice: v.sellingPrice / 100,
          active: v.active,
        }))
      : [
          {
            sku: "VER-STY-001-S",
            color: { name: "Noir Black", hex: "#000000" },
            size: "S",
            mrp: 4990,
            sellingPrice: 4490,
            active: true,
          },
        ]
  );

  // SEO
  const [seoTitle, setSeoTitle] = React.useState(initialData?.seo?.title || "");
  const [seoDesc, setSeoDesc] = React.useState(initialData?.seo?.description || "");
  const [canonicalUrl, setCanonicalUrl] = React.useState("");

  // Form Submission
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadLookups() {
      try {
        const [brandRes, catRes, colRes] = await Promise.all([
          fetch("/api/admin/brands"),
          fetch("/api/admin/categories"),
          fetch("/api/admin/collections"),
        ]);
        const [brandData, catData, colData] = await Promise.all([
          brandRes.json(),
          catRes.json(),
          colRes.json(),
        ]);
        if (brandData.data?.brands) setBrands(brandData.data.brands);
        if (catData.data?.categories) setCategories(catData.data.categories);
        if (colData.data?.collections) setCollections(colData.data.collections);
      } catch (e) {
        console.error("Failed to load options", e);
      }
    }
    loadLookups();
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      );
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        url: newImageUrl.trim(),
        alt: newImageAlt.trim() || title,
        isPrimary: prev.length === 0,
        sortOrder: prev.length,
      },
    ]);
    setNewImageUrl("");
    setNewImageAlt("");
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (prev[index]?.isPrimary && filtered.length > 0 && filtered[0]) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleAddVariant = () => {
    const nextNum = variants.length + 1;
    setVariants((prev) => [
      ...prev,
      {
        sku: `VER-${slug ? slug.toUpperCase().slice(0, 6) : "NEW"}-VAR-${nextNum}`,
        color: { name: "Classic Navy", hex: "#001f3f" },
        size: "M",
        mrp: 4990,
        sellingPrice: 4490,
        active: true,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("A product requires at least one variant configuration");
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // Validation check
      if (!title.trim()) throw new Error("Product title is required");
      if (!brandId) throw new Error("Please select a brand");
      if (categoryIds.length === 0) throw new Error("Select at least one category");
      if (images.length === 0 || !images[0]?.url)
        throw new Error("Add at least one product gallery image");

      const payload = {
        name: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        gender,
        status,
        productType: "Apparel",
        brandId: brandId || undefined,
        categoryIds,
        collectionIds: collectionIds.length ? collectionIds : undefined,
        fabric: fabric.trim() || undefined,
        pattern: pattern.trim() || undefined,
        fit: fit.trim() || undefined,
        occasion: occasion.trim() || undefined,
        careInstructions: careInstructions
          ? careInstructions
              .split("\n")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : undefined,
        images: images.filter((img) => Boolean(img.url)),
        variants: variants.map((v) => ({
          sku: v.sku.trim(),
          color: v.color,
          size: v.size,
          mrp: Math.round(v.mrp * 100),
          sellingPrice: Math.round(v.sellingPrice * 100),
          active: v.active,
        })),
        seo: {
          title: seoTitle.trim() || undefined,
          description: seoDesc.trim() || undefined,
        },
      };

      const url = isEditing ? `/api/admin/products/${initialData?.id}` : "/api/admin/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to save product");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-1.5 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-foreground font-normal">
              {isEditing ? `Edit Garment: ${title || "Product"}` : "Create New Garment Product"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Phase 28 Product Administration Architecture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className="bg-card border border-border rounded-sm text-xs px-2.5 py-1.5 font-medium"
          >
            <option value={ProductStatus.DRAFT}>Draft</option>
            <option value={ProductStatus.PUBLISHED}>Published</option>
            <option value={ProductStatus.ARCHIVED}>Archived</option>
          </select>

          <Button type="submit" size="sm" disabled={submitting} className="gap-2">
            {submitting ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {isEditing ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Core Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-card border border-border rounded-sm p-4 space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono text-[11px] border-b border-border pb-2">
              1. Basic Information
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Mulberry Silk Tailored Shirt"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  URL Slug (URL-Safe Identifier)
                </label>
                <div className="flex items-center">
                  <span className="bg-muted px-2.5 py-1.5 text-xs text-muted-foreground border border-r-0 border-border rounded-l-sm font-mono">
                    /products/
                  </span>
                  <input
                    type="text"
                    placeholder="pure-mulberry-silk-tailored-shirt"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-background border border-border rounded-r-sm px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description & Editorial Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed craftsmanship notes, silhouette description, and textile origin..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Gender Focus</label>
                <div className="flex gap-4">
                  {Object.values(Gender).map((g) => (
                    <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={gender === g}
                        onChange={() => setGender(g)}
                        className="rounded-full border-border"
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Garment Attributes */}
          <div className="bg-card border border-border rounded-sm p-4 space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono text-[11px] border-b border-border pb-2">
              2. Garment Technical Attributes
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Fabric / Textile</label>
                <input
                  type="text"
                  placeholder="100% Giza Cotton"
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Pattern</label>
                <input
                  type="text"
                  placeholder="Solid / Pinstripe"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Fit Silhouette</label>
                <input
                  type="text"
                  placeholder="Tailored Slim"
                  value={fit}
                  onChange={(e) => setFit(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Neck / Collar</label>
                <input
                  type="text"
                  placeholder="Spread Collar"
                  value={neck}
                  onChange={(e) => setNeck(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Sleeve Type</label>
                <input
                  type="text"
                  placeholder="Long Sleeve"
                  value={sleeve}
                  onChange={(e) => setSleeve(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Occasion</label>
                <input
                  type="text"
                  placeholder="Evening / Formal"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1 text-xs">
                Care Instructions (one per line)
              </label>
              <textarea
                rows={2}
                placeholder="Dry clean only&#10;Cool iron on reverse"
                value={careInstructions}
                onChange={(e) => setCareInstructions(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
              />
            </div>
          </div>

          {/* Section 3: Product Gallery Media */}
          <div className="bg-card border border-border rounded-sm p-4 space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono text-[11px] border-b border-border pb-2">
              3. Media Gallery (Secure Cloudinary / CDN References)
            </h2>

            <div className="space-y-3">
              {/* Image Input row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="Alt text (e.g. Model front profile wearing black coat)"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  className="sm:w-64 bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImage}
                  className="text-xs h-7 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Image
                </Button>
              </div>

              {/* Gallery List */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative border rounded-sm p-2 space-y-2 bg-background ${
                      img.isPrimary ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="aspect-[3/4] bg-muted overflow-hidden rounded-sm flex items-center justify-center">
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={img.alt || "Product image"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="primaryImage"
                          checked={!!img.isPrimary}
                          onChange={() => handleSetPrimaryImage(idx)}
                        />
                        <span className="text-muted-foreground">Primary</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Variants & Sizing Matrix */}
          <div className="bg-card border border-border rounded-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono text-[11px]">
                4. Variant Matrix (Color × Size)
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
                className="text-xs h-6 px-2 gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Variant
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Color (Name / Hex)</th>
                    <th className="p-2">Size</th>
                    <th className="p-2">MRP (₹)</th>
                    <th className="p-2">Selling Price (₹)</th>
                    <th className="p-2">Active</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {variants.map((v, i) => (
                    <tr key={i} className="hover:bg-muted/10">
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={v.sku}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariants((prev) =>
                              prev.map((item, idx) => (idx === i ? { ...item, sku: val } : item))
                            );
                          }}
                          className="w-28 bg-background border border-border rounded-sm px-1.5 py-0.5 text-xs font-mono"
                        />
                      </td>

                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={v.color.hex || "#000000"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? { ...item, color: { ...item.color, hex: val } }
                                    : item
                                )
                              );
                            }}
                            className="h-5 w-5 rounded border-0 p-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            placeholder="Color name"
                            value={v.color.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? { ...item, color: { ...item.color, name: val } }
                                    : item
                                )
                              );
                            }}
                            className="w-24 bg-background border border-border rounded-sm px-1.5 py-0.5 text-xs"
                          />
                        </div>
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="e.g. S, M, 32"
                          value={v.size}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariants((prev) =>
                              prev.map((item, idx) =>
                                idx === i ? { ...item, size: val } : item
                              )
                            );
                          }}
                          className="w-12 bg-background border border-border rounded-sm px-1.5 py-0.5 text-xs text-center font-mono"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={v.mrp}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setVariants((prev) =>
                              prev.map((item, idx) => (idx === i ? { ...item, mrp: val } : item))
                            );
                          }}
                          className="w-20 bg-background border border-border rounded-sm px-1.5 py-0.5 text-xs font-mono text-right"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={v.sellingPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setVariants((prev) =>
                              prev.map((item, idx) =>
                                idx === i ? { ...item, sellingPrice: val } : item
                              )
                            );
                          }}
                          className="w-20 bg-background border border-border rounded-sm px-1.5 py-0.5 text-xs font-mono text-right font-medium text-foreground"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={v.active}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setVariants((prev) =>
                              prev.map((item, idx) => (idx === i ? { ...item, active: val } : item))
                            );
                          }}
                          className="rounded border-border"
                        />
                      </td>

                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(i)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Classification & SEO Preview */}
        <div className="space-y-6">
          {/* Classification & Brand */}
          <div className="bg-card border border-border rounded-sm p-4 space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono text-[11px] border-b border-border pb-2">
              Classification
            </h2>

            {/* Brand */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Brand *</label>
              <select
                required
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select a Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Categories (At least 1 required)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-sm p-2 space-y-1.5 bg-background">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCategoryIds((prev) => [...prev, c.id]);
                        } else {
                          setCategoryIds((prev) => prev.filter((id) => id !== c.id));
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-foreground">{c.name}</span>
                    {c.parentName && (
                      <span className="text-[10px] text-muted-foreground">({c.parentName})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Collections */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Fashion Collections
              </label>
              <div className="max-h-36 overflow-y-auto border border-border rounded-sm p-2 space-y-1.5 bg-background">
                {collections.map((col) => (
                  <label key={col.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={collectionIds.includes(col.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCollectionIds((prev) => [...prev, col.id]);
                        } else {
                          setCollectionIds((prev) => prev.filter((id) => id !== col.id));
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-foreground">{col.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SEO Metadata & SERP Preview */}
          <div className="bg-card border border-border rounded-sm p-4 space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wider font-mono text-[11px] border-b border-border pb-2">
              SEO & Social Meta
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Meta Title</label>
                <input
                  type="text"
                  placeholder={title ? `${title} | VÉRONA` : "Meta Title"}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary for search engines..."
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Canonical URL</label>
                <input
                  type="text"
                  placeholder="https://verona.com/products/slug"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2.5 py-1 text-xs font-mono"
                />
              </div>

              {/* SERP Preview Box */}
              <div className="border border-border/80 rounded-sm p-3 bg-background/50 space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                  Search Engine Snippet Preview
                </span>
                <p className="text-xs text-[#1a0dab] dark:text-[#8ab4f8] font-medium truncate">
                  {seoTitle || title || "VÉRONA Garment"} | VÉRONA
                </p>
                <p className="text-[11px] text-[#006621] dark:text-[#a8dadc] truncate font-mono">
                  https://verona.fashion/products/{slug || "product-slug"}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {seoDesc ||
                    description ||
                    "Discover tailored Italian luxury and refined craftsmanship at VÉRONA."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
