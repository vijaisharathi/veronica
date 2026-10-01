/**
 * VÉRONA — Content Management Domain Service (Phase 28)
 *
 * Orchestration service for Banners, Homepage Sections, and Editorial Stories.
 * Supports active scheduling windows, priority ordering, section reordering,
 * and audit trail logging.
 */

import { connectToDatabase } from "@/db/client";
import { BannerModel, HomepageSectionModel, EditorialStoryModel } from "@/db/models";
import { IBanner, IHomepageSection, IEditorialStory, IStaff } from "@/types/database";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { normalizeSlug } from "@/lib/slug";
import { logAuditTrail } from "@/lib/audit";
import {
  AdminBannerDTO,
  AdminHomepageSectionDTO,
  AdminEditorialStoryDTO,
} from "./content.types";
import {
  AdminBannerCreateInput,
  AdminBannerUpdateInput,
  AdminHomepageSectionUpdateInput,
  AdminEditorialStoryCreateInput,
  AdminEditorialStoryUpdateInput,
} from "./content.validation";

export class ContentManagementService {
  // =========================================================================
  // 1. BANNER MANAGEMENT
  // =========================================================================

  /**
   * Lists all banners with live scheduling evaluation.
   */
  async listBanners(placement?: string): Promise<AdminBannerDTO[]> {
    await connectToDatabase();

    const query: Record<string, unknown> = {};
    if (placement) {
      query.placement = placement;
    }

    const banners = await BannerModel.find(query)
      .sort({ placement: 1, sortOrder: 1, createdAt: -1 })
      .lean<IBanner[]>();

    const now = new Date();

    return banners.map((b) => {
      const isStartValid = !b.startAt || new Date(b.startAt) <= now;
      const isEndValid = !b.endAt || new Date(b.endAt) >= now;
      const isCurrentlyActive = b.active && isStartValid && isEndValid;

      return {
        id: b._id.toString(),
        title: b.title,
        subtitle: b.subtitle,
        desktopImage: b.desktopImage,
        mobileImage: b.mobileImage,
        ctaText: b.ctaText,
        ctaUrl: b.ctaUrl,
        placement: b.placement,
        startAt: b.startAt ? new Date(b.startAt).toISOString() : null,
        endAt: b.endAt ? new Date(b.endAt).toISOString() : null,
        active: b.active,
        sortOrder: b.sortOrder ?? 0,
        isCurrentlyActive,
        createdAt: (b as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: (b as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
      };
    });
  }

  /**
   * Retrieves active banners for a specific storefront placement.
   */
  async getActiveBanners(placement: string, now: Date = new Date()): Promise<AdminBannerDTO[]> {
    await connectToDatabase();

    const banners = await BannerModel.find({
      placement,
      active: true,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    })
      .sort({ sortOrder: 1 })
      .lean<IBanner[]>();

    return banners.map((b) => ({
      id: b._id.toString(),
      title: b.title,
      subtitle: b.subtitle,
      desktopImage: b.desktopImage,
      mobileImage: b.mobileImage,
      ctaText: b.ctaText,
      ctaUrl: b.ctaUrl,
      placement: b.placement,
      startAt: b.startAt ? new Date(b.startAt).toISOString() : null,
      endAt: b.endAt ? new Date(b.endAt).toISOString() : null,
      active: b.active,
      sortOrder: b.sortOrder ?? 0,
      isCurrentlyActive: true,
      createdAt: (b as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (b as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  /**
   * Creates a banner.
   */
  async createBanner(input: AdminBannerCreateInput, staff: IStaff): Promise<AdminBannerDTO> {
    await connectToDatabase();

    const created = await BannerModel.create({
      ...input,
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "BANNER_CREATED",
      entityType: "BANNER",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    const all = await this.listBanners();
    return all.find((b) => b.id === created._id.toString())!;
  }

  /**
   * Updates a banner.
   */
  async updateBanner(id: string, input: AdminBannerUpdateInput, staff: IStaff): Promise<AdminBannerDTO> {
    await connectToDatabase();

    const existing = await BannerModel.findById(id);
    if (!existing) {
      throw new NotFoundError("Banner", id);
    }

    const beforeState = existing.toObject();

    const updatePayload: Record<string, unknown> = { ...input };
    if (input.startAt !== undefined) {
      updatePayload.startAt = input.startAt ? new Date(input.startAt) : null;
    }
    if (input.endAt !== undefined) {
      updatePayload.endAt = input.endAt ? new Date(input.endAt) : null;
    }

    Object.assign(existing, updatePayload);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "BANNER_UPDATED",
      entityType: "BANNER",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    const all = await this.listBanners();
    return all.find((b) => b.id === id)!;
  }

  /**
   * Deletes a banner.
   */
  async archiveBanner(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const existing = await BannerModel.findById(id);
    if (!existing) {
      throw new NotFoundError("Banner", id);
    }

    await BannerModel.deleteOne({ _id: id });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "BANNER_DELETED",
      entityType: "BANNER",
      entityId: id,
    });

    return true;
  }

  deleteBanner(id: string, staff: IStaff): Promise<boolean> {
    return this.archiveBanner(id, staff);
  }

  // =========================================================================
  // 2. HOMEPAGE SECTION MANAGEMENT
  // =========================================================================

  /**
   * Lists all homepage sections. If none are present in database, seeds default sections.
   */
  async listSections(): Promise<AdminHomepageSectionDTO[]> {
    await connectToDatabase();

    let sections = await HomepageSectionModel.find()
      .sort({ sortOrder: 1 })
      .lean<IHomepageSection[]>();

    if (sections.length === 0) {
      await this.seedDefaultHomepageSections();
      sections = await HomepageSectionModel.find()
        .sort({ sortOrder: 1 })
        .lean<IHomepageSection[]>();
    }

    return sections.map((s) => ({
      id: s._id.toString(),
      sectionType: s.sectionType,
      title: s.title,
      subtitle: s.subtitle,
      contentReferences: s.contentReferences,
      configuration: s.configuration,
      sortOrder: s.sortOrder ?? 0,
      active: s.active,
      createdAt: (s as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (s as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  /**
   * Updates a homepage section.
   */
  async updateSection(
    id: string,
    input: AdminHomepageSectionUpdateInput,
    staff: IStaff
  ): Promise<AdminHomepageSectionDTO> {
    await connectToDatabase();

    const existing = await HomepageSectionModel.findById(id);
    if (!existing) {
      throw new NotFoundError("HomepageSection", id);
    }

    const beforeState = existing.toObject();
    Object.assign(existing, input);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "HOMEPAGE_SECTION_UPDATED",
      entityType: "HOMEPAGE_SECTION",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    const all = await this.listSections();
    return all.find((s) => s.id === id)!;
  }

  /**
   * Reorders homepage sections sequentially.
   */
  async reorderSections(orderedIds: string[], staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await HomepageSectionModel.bulkWrite(bulkOps);
    }

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "HOMEPAGE_SECTIONS_REORDERED",
      entityType: "HOMEPAGE_SECTION",
      entityId: "BULK",
      metadata: { orderedIds },
    });

    return true;
  }

  /**
   * Seeds default sections based on the Phase 7 homepage presentation architecture.
   */
  private async seedDefaultHomepageSections(): Promise<void> {
    const defaultSections = [
      { sectionType: "HERO", title: "Runway Drop", subtitle: "Everyday Elevated", sortOrder: 0, active: true },
      { sectionType: "CATEGORY_GRID", title: "Shop by Category", subtitle: "Curated Edits", sortOrder: 1, active: true },
      { sectionType: "TRENDING", title: "Trending Now", subtitle: "Most Coveted Silhouettes", sortOrder: 2, active: true },
      { sectionType: "NEW_ARRIVALS", title: "New Arrivals", subtitle: "Fresh from the Atelier", sortOrder: 3, active: true },
      { sectionType: "FEATURED_COLLECTION", title: "Featured Collection", subtitle: "Handcrafted Heritage", sortOrder: 4, active: true },
      { sectionType: "BEST_SELLERS", title: "Popular Picks", subtitle: "Client Favorites", sortOrder: 5, active: true },
      { sectionType: "PROMOTION", title: "Private Salon Offer", subtitle: "Bespoke Privileges", sortOrder: 6, active: true },
      { sectionType: "EDITORIAL", title: "The Atelier Story", subtitle: "Artisanal Heritage", sortOrder: 7, active: true },
      { sectionType: "STYLE_DISCOVERY", title: "Style Discovery", subtitle: "Curated Aesthetics", sortOrder: 8, active: true },
      { sectionType: "TRUST", title: "The VÉRONA Promise", subtitle: "Complimentary Alterations & Courier", sortOrder: 9, active: true },
      { sectionType: "NEWSLETTER", title: "Private Salon Invitations", subtitle: "Receive First Access", sortOrder: 10, active: true },
    ];

    await HomepageSectionModel.insertMany(defaultSections);
  }

  // =========================================================================
  // 3. EDITORIAL STORY MANAGEMENT
  // =========================================================================

  /**
   * Lists editorial stories with status and sorting.
   */
  async listStories(includeInactive = false): Promise<AdminEditorialStoryDTO[]> {
    await connectToDatabase();

    const query: Record<string, unknown> = { isDeleted: false };
    if (!includeInactive) {
      query.active = true;
    }

    const stories = await EditorialStoryModel.find(query)
      .sort({ sortOrder: 1, publishedAt: -1, createdAt: -1 })
      .lean<IEditorialStory[]>();

    return stories.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      slug: s.slug,
      excerpt: s.excerpt,
      content: s.content,
      heroImage: s.heroImage,
      author: s.author,
      status: s.status,
      readingTimeMinutes:
        s.readingTimeMinutes ||
        Math.max(1, Math.ceil((s.content?.split(/\s+/).length || 0) / 200)),
      publishedAt: s.publishedAt ? new Date(s.publishedAt).toISOString() : null,
      sortOrder: s.sortOrder ?? 0,
      active: s.active,
      seo: s.seo,
      createdAt: (s as unknown as { createdAt: Date }).createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: (s as unknown as { updatedAt: Date }).updatedAt?.toISOString() || new Date().toISOString(),
    }));
  }

  /**
   * Creates an editorial story with slug conflict detection.
   */
  async createStory(input: AdminEditorialStoryCreateInput, staff: IStaff): Promise<AdminEditorialStoryDTO> {
    await connectToDatabase();

    const normalizedSlug = normalizeSlug(input.slug || input.title);
    const existing = await EditorialStoryModel.findOne({ slug: normalizedSlug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Editorial story with slug '${normalizedSlug}' already exists`);
    }

    const created = await EditorialStoryModel.create({
      ...input,
      slug: normalizedSlug,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      isDeleted: false,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "EDITORIAL_STORY_CREATED",
      entityType: "EDITORIAL_STORY",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    const all = await this.listStories(true);
    return all.find((s) => s.id === created._id.toString())!;
  }

  /**
   * Updates an editorial story.
   */
  async updateStory(
    id: string,
    input: AdminEditorialStoryUpdateInput,
    staff: IStaff
  ): Promise<AdminEditorialStoryDTO> {
    await connectToDatabase();

    const existing = await EditorialStoryModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("EditorialStory", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const normalizedSlug = normalizeSlug(input.slug);
      const conflict = await EditorialStoryModel.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(`Editorial story with slug '${normalizedSlug}' already exists`);
      }
      input.slug = normalizedSlug;
    }

    const beforeState = existing.toObject();

    if (input.status === "PUBLISHED" && existing.status !== "PUBLISHED" && !existing.publishedAt) {
      existing.publishedAt = new Date();
    }

    Object.assign(existing, input);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "EDITORIAL_STORY_UPDATED",
      entityType: "EDITORIAL_STORY",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    const all = await this.listStories(true);
    return all.find((s) => s.id === id)!;
  }

  /**
   * Archives an editorial story.
   */
  async archiveStory(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const existing = await EditorialStoryModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("EditorialStory", id);
    }

    existing.isDeleted = true;
    existing.active = false;
    existing.status = "ARCHIVED";
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "EDITORIAL_STORY_ARCHIVED",
      entityType: "EDITORIAL_STORY",
      entityId: id,
    });

    return true;
  }

  createEditorialStory(input: AdminEditorialStoryCreateInput, staff: IStaff) {
    return this.createStory(input, staff);
  }

  listEditorialStories(status?: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    return this.listStories(true);
  }

  updateEditorialStory(id: string, input: AdminEditorialStoryUpdateInput, staff: IStaff) {
    return this.updateStory(id, input, staff);
  }

  archiveEditorialStory(id: string, staff: IStaff) {
    return this.archiveStory(id, staff);
  }
}

export const contentManagementService = new ContentManagementService();
