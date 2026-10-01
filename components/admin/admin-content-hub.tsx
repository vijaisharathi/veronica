"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  AdminBannerDTO,
  AdminHomepageSectionDTO,
  AdminEditorialStoryDTO,
} from "@/modules/content/content.types";

export function AdminContentHub() {
  const [activeTab, setActiveTab] = React.useState<"sections" | "banners" | "editorial">("sections");

  // =========================================================================
  // 1. HOMEPAGE SECTIONS STATE
  // =========================================================================
  const [sections, setSections] = React.useState<AdminHomepageSectionDTO[]>([]);
  const [loadingSections, setLoadingSections] = React.useState(true);

  const fetchSections = React.useCallback(async () => {
    try {
      setLoadingSections(true);
      const res = await fetch("/api/admin/content/sections");
      const data = await res.json();
      if (data.success && data.data?.sections) {
        setSections(data.data.sections);
      }
    } catch (e) {
      console.error("Failed to load homepage sections", e);
    } finally {
      setLoadingSections(false);
    }
  }, []);

  const handleToggleSectionVisibility = async (section: AdminHomepageSectionDTO) => {
    try {
      const res = await fetch(`/api/admin/content/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !section.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to toggle visibility");
      await fetchSections();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  };

  const handleMoveSection = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setSections(reordered);

    try {
      await fetch("/api/admin/content/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((s) => s.id) }),
      });
    } catch (e) {
      console.error("Failed to reorder sections", e);
      await fetchSections();
    }
  };

  // =========================================================================
  // 2. BANNERS STATE
  // =========================================================================
  const [banners, setBanners] = React.useState<AdminBannerDTO[]>([]);
  const [loadingBanners, setLoadingBanners] = React.useState(true);
  const [bannerModal, setBannerModal] = React.useState(false);
  const [editingBannerId, setEditingBannerId] = React.useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = React.useState("");
  const [bannerSubtitle, setBannerSubtitle] = React.useState("");
  const [desktopImage, setDesktopImage] = React.useState("");
  const [mobileImage, setMobileImage] = React.useState("");
  const [ctaText, setCtaText] = React.useState("");
  const [ctaUrl, setCtaUrl] = React.useState("");
  const [placement, setPlacement] = React.useState("HOMEPAGE_TOP");
  const [bannerStartAt, setBannerStartAt] = React.useState("");
  const [bannerEndAt, setBannerEndAt] = React.useState("");
  const [bannerActive, setBannerActive] = React.useState(true);
  const [savingBanner, setSavingBanner] = React.useState(false);

  const fetchBanners = React.useCallback(async () => {
    try {
      setLoadingBanners(true);
      const res = await fetch("/api/admin/content/banners");
      const data = await res.json();
      if (data.success && data.data?.banners) {
        setBanners(data.data.banners);
      }
    } catch (e) {
      console.error("Failed to load banners", e);
    } finally {
      setLoadingBanners(false);
    }
  }, []);

  const handleOpenCreateBanner = () => {
    setEditingBannerId(null);
    setBannerTitle("");
    setBannerSubtitle("");
    setDesktopImage("");
    setMobileImage("");
    setCtaText("Discover Collection");
    setCtaUrl("/collections");
    setPlacement("HOMEPAGE_TOP");
    setBannerStartAt("");
    setBannerEndAt("");
    setBannerActive(true);
    setBannerModal(true);
  };

  const handleOpenEditBanner = (b: AdminBannerDTO) => {
    setEditingBannerId(b.id);
    setBannerTitle(b.title);
    setBannerSubtitle(b.subtitle || "");
    setDesktopImage(b.desktopImage);
    setMobileImage(b.mobileImage || "");
    setCtaText(b.ctaText || "");
    setCtaUrl(b.ctaUrl || "");
    setPlacement(b.placement);
    setBannerStartAt(b.startAt ? b.startAt.slice(0, 16) : "");
    setBannerEndAt(b.endAt ? b.endAt.slice(0, 16) : "");
    setBannerActive(b.active);
    setBannerModal(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBanner(true);
      const payload = {
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim() || undefined,
        desktopImage: desktopImage.trim(),
        mobileImage: mobileImage.trim() || undefined,
        ctaText: ctaText.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        placement,
        startAt: bannerStartAt ? new Date(bannerStartAt).toISOString() : null,
        endAt: bannerEndAt ? new Date(bannerEndAt).toISOString() : null,
        active: bannerActive,
      };

      const url = editingBannerId
        ? `/api/admin/content/banners/${editingBannerId}`
        : "/api/admin/content/banners";
      const method = editingBannerId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save banner");

      setBannerModal(false);
      await fetchBanners();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error saving banner");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional banner?")) return;
    try {
      const res = await fetch(`/api/admin/content/banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete banner");
      await fetchBanners();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error deleting banner");
    }
  };

  // =========================================================================
  // 3. EDITORIAL STORIES STATE
  // =========================================================================
  const [stories, setStories] = React.useState<AdminEditorialStoryDTO[]>([]);
  const [loadingStories, setLoadingStories] = React.useState(true);
  const [storyModal, setStoryModal] = React.useState(false);
  const [editingStoryId, setEditingStoryId] = React.useState<string | null>(null);
  const [storyTitle, setStoryTitle] = React.useState("");
  const [storySlug, setStorySlug] = React.useState("");
  const [storyExcerpt, setStoryExcerpt] = React.useState("");
  const [storyContent, setStoryContent] = React.useState("");
  const [storyHeroImage, setStoryHeroImage] = React.useState("");
  const [storyStatus, setStoryStatus] = React.useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [savingStory, setSavingStory] = React.useState(false);

  const fetchStories = React.useCallback(async () => {
    try {
      setLoadingStories(true);
      const res = await fetch("/api/admin/content/editorial");
      const data = await res.json();
      if (data.success && data.data?.stories) {
        setStories(data.data.stories);
      }
    } catch (e) {
      console.error("Failed to load editorial stories", e);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  const handleOpenCreateStory = () => {
    setEditingStoryId(null);
    setStoryTitle("");
    setStorySlug("");
    setStoryExcerpt("");
    setStoryContent("");
    setStoryHeroImage("");
    setStoryStatus("DRAFT");
    setStoryModal(true);
  };

  const handleOpenEditStory = (s: AdminEditorialStoryDTO) => {
    setEditingStoryId(s.id);
    setStoryTitle(s.title);
    setStorySlug(s.slug);
    setStoryExcerpt(s.excerpt || "");
    setStoryContent(s.content);
    setStoryHeroImage(s.heroImage || "");
    setStoryStatus(s.status);
    setStoryModal(true);
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingStory(true);
      const payload = {
        title: storyTitle.trim(),
        slug: storySlug.trim() || undefined,
        excerpt: storyExcerpt.trim() || undefined,
        content: storyContent.trim(),
        heroImage: storyHeroImage.trim() || undefined,
        status: storyStatus,
      };

      const url = editingStoryId
        ? `/api/admin/content/editorial/${editingStoryId}`
        : "/api/admin/content/editorial";
      const method = editingStoryId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save story");

      setStoryModal(false);
      await fetchStories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error saving editorial story");
    } finally {
      setSavingStory(false);
    }
  };

  const handleArchiveStory = async (id: string) => {
    if (!confirm("Are you sure you want to archive this editorial story?")) return;
    try {
      const res = await fetch(`/api/admin/content/editorial/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive story");
      await fetchStories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error archiving story");
    }
  };

  React.useEffect(() => {
    if (activeTab === "sections") fetchSections();
    else if (activeTab === "banners") fetchBanners();
    else if (activeTab === "editorial") fetchStories();
  }, [activeTab, fetchSections, fetchBanners, fetchStories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground font-normal">Content Management Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Orchestrate homepage layouts, promotional banners, and luxury editorial stories.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 border border-border bg-card p-1 rounded-sm text-xs">
          <button
            onClick={() => setActiveTab("sections")}
            className={`px-3 py-1 rounded-sm font-medium transition-colors ${
              activeTab === "sections" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Homepage Sections
          </button>
          <button
            onClick={() => setActiveTab("banners")}
            className={`px-3 py-1 rounded-sm font-medium transition-colors ${
              activeTab === "banners" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Banners & Hero
          </button>
          <button
            onClick={() => setActiveTab("editorial")}
            className={`px-3 py-1 rounded-sm font-medium transition-colors ${
              activeTab === "editorial" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Editorial Stories
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: HOMEPAGE SECTIONS
         ===================================================================== */}
      {activeTab === "sections" && (
        <div className="border border-border bg-card rounded-sm overflow-hidden space-y-0">
          <div className="p-3 bg-muted/20 border-b border-border text-xs text-muted-foreground flex justify-between items-center">
            <span>Reorder homepage modular sections or toggle visibility on the live storefront.</span>
            <span className="font-mono text-[11px]">{sections.length} sections configured</span>
          </div>

          {loadingSections ? (
            <div className="p-12 text-center">
              <Spinner className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading sections...</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`p-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors ${
                    !section.active ? "opacity-60 bg-muted/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveSection(idx, "up")}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        disabled={idx === sections.length - 1}
                        onClick={() => handleMoveSection(idx, "down")}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-xs">{section.title}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {section.sectionType}
                        </Badge>
                      </div>
                      {section.subtitle && (
                        <p className="text-[11px] text-muted-foreground">{section.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant={section.active ? "primary" : "outline"}
                      onClick={() => handleToggleSectionVisibility(section)}
                      className={`text-xs h-7 px-2.5 ${
                        section.active ? "bg-emerald-700 hover:bg-emerald-800" : ""
                      }`}
                    >
                      {section.active ? "Active" : "Inactive"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: BANNERS & SCHEDULING
         ===================================================================== */}
      {activeTab === "banners" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Promotional banners evaluate publication windows server-side.
            </span>
            <Button size="sm" onClick={handleOpenCreateBanner} className="gap-2">
              <Plus className="h-4 w-4" />
              New Banner
            </Button>
          </div>

          <div className="border border-border bg-card rounded-sm overflow-hidden">
            {loadingBanners ? (
              <div className="p-12 text-center">
                <Spinner className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading promotional banners...</p>
              </div>
            ) : banners.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm font-medium text-foreground">No banners active</p>
                <p className="text-xs text-muted-foreground">
                  Create hero sliders or top strip banners with live date scheduling.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Banner</th>
                      <th className="py-2.5 px-3">Placement</th>
                      <th className="py-2.5 px-3">Schedule Window</th>
                      <th className="py-2.5 px-3">Live Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {banners.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={b.desktopImage}
                              alt={b.title}
                              className="h-9 w-16 object-cover rounded-sm border border-border"
                            />
                            <div>
                              <span className="font-medium text-foreground block">{b.title}</span>
                              {b.subtitle && (
                                <span className="text-[10px] text-muted-foreground block line-clamp-1">
                                  {b.subtitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {b.placement}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {b.startAt || b.endAt ? (
                            <span>
                              {b.startAt ? new Date(b.startAt).toLocaleDateString() : "Immediate"} →{" "}
                              {b.endAt ? new Date(b.endAt).toLocaleDateString() : "Indefinite"}
                            </span>
                          ) : (
                            <span>Always Active</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {b.isCurrentlyActive ? (
                            <Badge variant="default" className="text-[10px] bg-emerald-700">
                              Active Live
                            </Badge>
                          ) : b.active ? (
                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                              Scheduled / Expired
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditBanner(b)}
                              title="Edit Banner"
                              className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBanner(b.id)}
                              title="Delete Banner"
                              className="p-1.5 hover:text-destructive hover:bg-muted rounded-sm transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* =====================================================================
          TAB 3: EDITORIAL STORIES
         ===================================================================== */}
      {activeTab === "editorial" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Fashion journalism, craft deep dives, and atelier heritage stories.
            </span>
            <Button size="sm" onClick={handleOpenCreateStory} className="gap-2">
              <Plus className="h-4 w-4" />
              New Editorial Story
            </Button>
          </div>

          <div className="border border-border bg-card rounded-sm overflow-hidden">
            {loadingStories ? (
              <div className="p-12 text-center">
                <Spinner className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Loading editorial stories...</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm font-medium text-foreground">No editorial stories</p>
                <p className="text-xs text-muted-foreground">
                  Publish craftsmanship notes like &ldquo;The Anatomy of 100% Mulberry Silk&rdquo;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Story</th>
                      <th className="py-2.5 px-3">Slug</th>
                      <th className="py-2.5 px-3">Reading Time</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stories.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3">
                            {s.heroImage ? (
                              <img
                                src={s.heroImage}
                                alt={s.title}
                                className="h-9 w-14 object-cover rounded-sm border border-border"
                              />
                            ) : (
                              <div className="h-9 w-14 bg-muted rounded-sm border border-border flex items-center justify-center text-muted-foreground">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-foreground block">{s.title}</span>
                              {s.excerpt && (
                                <span className="text-[10px] text-muted-foreground block line-clamp-1 max-w-sm">
                                  {s.excerpt}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          /editorial/{s.slug}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {s.readingTimeMinutes} min read
                        </td>

                        <td className="py-2.5 px-3">
                          {s.status === "PUBLISHED" ? (
                            <Badge variant="default" className="text-[10px] bg-emerald-700">
                              Published
                            </Badge>
                          ) : s.status === "ARCHIVED" ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Draft
                            </Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditStory(s)}
                              title="Edit Story"
                              className="p-1.5 hover:text-primary hover:bg-muted rounded-sm transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleArchiveStory(s.id)}
                              title="Archive Story"
                              className="p-1.5 hover:text-destructive hover:bg-muted rounded-sm transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* Banner Create / Edit Modal */}
      {bannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-sm max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h2 className="font-serif text-lg font-normal text-foreground border-b border-border pb-2">
              {editingBannerId ? "Edit Promotional Banner" : "Create Promotional Banner"}
            </h2>

            <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Season Private Sale"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Enjoy up to 40% privilege on selected winter outerwear"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-foreground font-medium mb-1">Placement *</label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5"
                  >
                    <option value="HOMEPAGE_TOP">Top Announcement Strip</option>
                    <option value="HERO_SLIDER">Hero Slider</option>
                    <option value="COLLECTION_HEADER">Collection Header</option>
                    <option value="PROMOTIONAL_STRIP">Promotional Strip</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">CTA Label</label>
                  <input
                    type="text"
                    placeholder="Explore Capsule"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">CTA Destination URL</label>
                <input
                  type="text"
                  placeholder="/collections/winter-sale"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Desktop Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={desktopImage}
                  onChange={(e) => setDesktopImage(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Start Date / Time</label>
                  <input
                    type="datetime-local"
                    value={bannerStartAt}
                    onChange={(e) => setBannerStartAt(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">End Date / Time</label>
                  <input
                    type="datetime-local"
                    value={bannerEndAt}
                    onChange={(e) => setBannerEndAt(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="banner-active"
                  checked={bannerActive}
                  onChange={(e) => setBannerActive(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="banner-active" className="cursor-pointer text-foreground">
                  Active Banner
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBannerModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingBanner} className="gap-2">
                  {savingBanner && <Spinner className="h-3.5 w-3.5" />}
                  Save Banner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editorial Story Create / Edit Modal */}
      {storyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-sm max-w-xl w-full p-6 space-y-4 shadow-xl">
            <h2 className="font-serif text-lg font-normal text-foreground border-b border-border pb-2">
              {editingStoryId ? "Edit Editorial Story" : "Create Editorial Story"}
            </h2>

            <form onSubmit={handleSaveStory} className="space-y-3 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">Story Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Craft of Bespoke Cashmere"
                  value={storyTitle}
                  onChange={(e) => {
                    setStoryTitle(e.target.value);
                    if (!editingStoryId) {
                      setStorySlug(
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-foreground font-medium mb-1">Slug</label>
                  <input
                    type="text"
                    placeholder="craft-of-bespoke-cashmere"
                    value={storySlug}
                    onChange={(e) => setStorySlug(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">Publication Status</label>
                  <select
                    value={storyStatus}
                    onChange={(e) => setStoryStatus(e.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED")}
                    className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Hero Photography URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={storyHeroImage}
                  onChange={(e) => setStoryHeroImage(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Short Excerpt</label>
                <textarea
                  rows={2}
                  placeholder="Brief synopsis appearing on magazine indexes..."
                  value={storyExcerpt}
                  onChange={(e) => setStoryExcerpt(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">Story Content *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Editorial body prose..."
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStoryModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingStory} className="gap-2">
                  {savingStory && <Spinner className="h-3.5 w-3.5" />}
                  Save Story
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
