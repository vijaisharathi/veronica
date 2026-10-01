/**
 * VÉRONA — Marketing Campaign Management Service (Phase 28)
 *
 * Central administrative service for orchestrating marketing campaigns,
 * targeting references (categories, products, collections, brands),
 * campaign scheduling, activation validations, and UTM metadata.
 * Strictly respects Phase 15 pricing & coupon boundary.
 */

import { connectToDatabase } from "@/db/client";
import {
  CampaignModel,
  CategoryModel,
  BrandModel,
  FashionCollectionModel,
  ProductModel,
} from "@/db/models";
import { CampaignStatus, DiscountType } from "@/constants/status";
import { ICampaign, IStaff, MinorUnits } from "@/types/database";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { normalizeSlug } from "@/lib/slug";
import { logAuditTrail } from "@/lib/audit";
import {
  AdminCampaignCreateInput,
  AdminCampaignUpdateInput,
} from "./campaign.validation";

export interface AdminCampaignDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  banner?: string;
  startAt: string;
  endAt: string;
  status: CampaignStatus;
  priority: number;
  discountConfig: {
    type: DiscountType;
    value: number;
  };
  targetCategoryIds: string[];
  targetCategoryNames: string[];
  targetProductIds: string[];
  targetCollectionIds: string[];
  targetCollectionNames: string[];
  targetBrandIds: string[];
  targetBrandNames: string[];
  maxDiscountAmount?: MinorUnits;
  stackable: boolean;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  isCurrentlyActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CampaignManagementService {
  /**
   * Lists campaigns with optional status and search filtering.
   */
  async listCampaigns(status?: CampaignStatus, search?: string): Promise<AdminCampaignDTO[]> {
    await connectToDatabase();

    const query: Record<string, unknown> = { isDeleted: false };
    if (status) {
      query.status = status;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    const campaigns = await CampaignModel.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean<ICampaign[]>();

    if (campaigns.length === 0) return [];

    // Fetch reference names
    const allCatIds = Array.from(new Set(campaigns.flatMap((c) => c.targetCategoryIds || [])));
    const allColIds = Array.from(new Set(campaigns.flatMap((c) => c.targetCollectionIds || [])));
    const allBrandIds = Array.from(new Set(campaigns.flatMap((c) => c.targetBrandIds || [])));

    const [categories, collections, brands] = await Promise.all([
      CategoryModel.find({ _id: { $in: allCatIds } }).lean(),
      FashionCollectionModel.find({ _id: { $in: allColIds } }).lean(),
      BrandModel.find({ _id: { $in: allBrandIds } }).lean(),
    ]);

    const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]));
    const colMap = new Map(collections.map((c) => [c._id.toString(), c.name]));
    const brandMap = new Map(brands.map((b) => [b._id.toString(), b.name]));

    const now = new Date();

    return campaigns.map((c) => {
      const startDate = new Date(c.startAt);
      const endDate = new Date(c.endAt);
      const isCurrentlyActive =
        c.status === CampaignStatus.ACTIVE && now >= startDate && now <= endDate;

      return {
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description,
        banner: c.banner,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        status: c.status,
        priority: c.priority ?? 0,
        discountConfig: c.discountConfig,
        targetCategoryIds: c.targetCategoryIds || [],
        targetCategoryNames: (c.targetCategoryIds || []).map((id) => catMap.get(id) || "Category"),
        targetProductIds: c.targetProductIds || [],
        targetCollectionIds: c.targetCollectionIds || [],
        targetCollectionNames: (c.targetCollectionIds || []).map((id) => colMap.get(id) || "Collection"),
        targetBrandIds: c.targetBrandIds || [],
        targetBrandNames: (c.targetBrandIds || []).map((id) => brandMap.get(id) || "Brand"),
        maxDiscountAmount: c.maxDiscountAmount,
        stackable: !!c.stackable,
        utm: (c as unknown as { utm?: AdminCampaignDTO["utm"] }).utm,
        isCurrentlyActive,
        createdAt: (c as unknown as { createdAt: Date }).createdAt?.toISOString() || now.toISOString(),
        updatedAt: (c as unknown as { updatedAt: Date }).updatedAt?.toISOString() || now.toISOString(),
      };
    });
  }

  /**
   * Retrieves single campaign by ID.
   */
  async getCampaignById(id: string): Promise<AdminCampaignDTO> {
    await connectToDatabase();

    const campaign = await CampaignModel.findOne({ _id: id, isDeleted: false }).lean<ICampaign>();
    if (!campaign) {
      throw new NotFoundError("Campaign", id);
    }

    const [categories, collections, brands] = await Promise.all([
      CategoryModel.find({ _id: { $in: campaign.targetCategoryIds || [] } }).lean(),
      FashionCollectionModel.find({ _id: { $in: campaign.targetCollectionIds || [] } }).lean(),
      BrandModel.find({ _id: { $in: campaign.targetBrandIds || [] } }).lean(),
    ]);

    const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]));
    const colMap = new Map(collections.map((c) => [c._id.toString(), c.name]));
    const brandMap = new Map(brands.map((b) => [b._id.toString(), b.name]));

    const now = new Date();
    const startDate = new Date(campaign.startAt);
    const endDate = new Date(campaign.endAt);
    const isCurrentlyActive =
      campaign.status === CampaignStatus.ACTIVE && now >= startDate && now <= endDate;

    return {
      id: campaign._id.toString(),
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      banner: campaign.banner,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      status: campaign.status,
      priority: campaign.priority ?? 0,
      discountConfig: campaign.discountConfig,
      targetCategoryIds: campaign.targetCategoryIds || [],
      targetCategoryNames: (campaign.targetCategoryIds || []).map((catId) => catMap.get(catId) || "Category"),
      targetProductIds: campaign.targetProductIds || [],
      targetCollectionIds: campaign.targetCollectionIds || [],
      targetCollectionNames: (campaign.targetCollectionIds || []).map((colId) => colMap.get(colId) || "Collection"),
      targetBrandIds: campaign.targetBrandIds || [],
      targetBrandNames: (campaign.targetBrandIds || []).map((bId) => brandMap.get(bId) || "Brand"),
      maxDiscountAmount: campaign.maxDiscountAmount,
      stackable: !!campaign.stackable,
      utm: (campaign as unknown as { utm?: AdminCampaignDTO["utm"] }).utm,
      isCurrentlyActive,
      createdAt: (campaign as unknown as { createdAt: Date }).createdAt?.toISOString() || now.toISOString(),
      updatedAt: (campaign as unknown as { updatedAt: Date }).updatedAt?.toISOString() || now.toISOString(),
    };
  }

  /**
   * Creates a promotional campaign.
   */
  async createCampaign(input: AdminCampaignCreateInput, staff: IStaff): Promise<AdminCampaignDTO> {
    await connectToDatabase();

    const normalizedSlug = normalizeSlug(input.slug || input.name);
    const existing = await CampaignModel.findOne({ slug: normalizedSlug, isDeleted: false });
    if (existing) {
      throw new ConflictError(`Campaign with slug '${normalizedSlug}' already exists`);
    }

    const created = await CampaignModel.create({
      ...input,
      slug: normalizedSlug,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      status: CampaignStatus.DRAFT,
      isDeleted: false,
    });

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CAMPAIGN_CREATED",
      entityType: "CAMPAIGN",
      entityId: created._id.toString(),
      after: created.toObject(),
    });

    return this.getCampaignById(created._id.toString());
  }

  /**
   * Updates campaign configuration.
   */
  async updateCampaign(
    id: string,
    input: AdminCampaignUpdateInput,
    staff: IStaff
  ): Promise<AdminCampaignDTO> {
    await connectToDatabase();

    const existing = await CampaignModel.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      throw new NotFoundError("Campaign", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const normalizedSlug = normalizeSlug(input.slug);
      const conflict = await CampaignModel.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(`Campaign with slug '${normalizedSlug}' already exists`);
      }
      input.slug = normalizedSlug;
    }

    const beforeState = existing.toObject();

    const updatePayload: Record<string, unknown> = { ...input };
    if (input.startAt) updatePayload.startAt = new Date(input.startAt);
    if (input.endAt) updatePayload.endAt = new Date(input.endAt);

    Object.assign(existing, updatePayload);
    await existing.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CAMPAIGN_UPDATED",
      entityType: "CAMPAIGN",
      entityId: id,
      before: beforeState,
      after: existing.toObject(),
    });

    return this.getCampaignById(id);
  }

  /**
   * Activates a campaign after strictly validating publication window and referenced targets.
   */
  async activateCampaign(id: string, staff: IStaff): Promise<AdminCampaignDTO> {
    await connectToDatabase();

    const campaign = await CampaignModel.findOne({ _id: id, isDeleted: false });
    if (!campaign) {
      throw new NotFoundError("Campaign", id);
    }

    const now = new Date();
    if (new Date(campaign.endAt) <= now) {
      throw new ValidationError("Cannot activate campaign whose end date is in the past");
    }

    // Verify referenced categories if any
    if (campaign.targetCategoryIds && campaign.targetCategoryIds.length > 0) {
      const activeCats = await CategoryModel.countDocuments({
        _id: { $in: campaign.targetCategoryIds },
        isDeleted: false,
      });
      if (activeCats === 0) {
        throw new ValidationError("All targeted categories for this campaign are missing or deleted");
      }
    }

    // Verify referenced products if any
    if (campaign.targetProductIds && campaign.targetProductIds.length > 0) {
      const activeProds = await ProductModel.countDocuments({
        _id: { $in: campaign.targetProductIds },
        isDeleted: false,
      });
      if (activeProds === 0) {
        throw new ValidationError("All targeted products for this campaign are missing or deleted");
      }
    }

    const beforeStatus = campaign.status;
    campaign.status = CampaignStatus.ACTIVE;
    await campaign.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CAMPAIGN_ACTIVATED",
      entityType: "CAMPAIGN",
      entityId: id,
      before: { status: beforeStatus },
      after: { status: campaign.status },
    });

    return this.getCampaignById(id);
  }

  /**
   * Pauses an active campaign.
   */
  async pauseCampaign(id: string, staff: IStaff): Promise<AdminCampaignDTO> {
    await connectToDatabase();

    const campaign = await CampaignModel.findOne({ _id: id, isDeleted: false });
    if (!campaign) {
      throw new NotFoundError("Campaign", id);
    }

    const beforeStatus = campaign.status;
    campaign.status = CampaignStatus.PAUSED;
    await campaign.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CAMPAIGN_PAUSED",
      entityType: "CAMPAIGN",
      entityId: id,
      before: { status: beforeStatus },
      after: { status: campaign.status },
    });

    return this.getCampaignById(id);
  }

  /**
   * Archives / soft-deletes a campaign.
   */
  async archiveCampaign(id: string, staff: IStaff): Promise<boolean> {
    await connectToDatabase();

    const campaign = await CampaignModel.findOne({ _id: id, isDeleted: false });
    if (!campaign) {
      throw new NotFoundError("Campaign", id);
    }

    campaign.isDeleted = true;
    campaign.status = CampaignStatus.EXPIRED;
    await campaign.save();

    await logAuditTrail({
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: "CAMPAIGN_ARCHIVED",
      entityType: "CAMPAIGN",
      entityId: id,
    });

    return true;
  }
}

export const campaignManagementService = new CampaignManagementService();
