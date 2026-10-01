/**
 * VÉRONA — Admin Marketing Campaigns Unit Tests (Phase 28)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignManagementService } from "@/modules/campaigns/campaign-management.service";
import { CampaignStatus, DiscountType } from "@/constants/status";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAuditTrail: vi.fn().mockResolvedValue(undefined),
}));

const mockCampaignFind = vi.fn();
const mockCampaignFindOne = vi.fn();
const mockCampaignCreate = vi.fn();
const mockCategoryCount = vi.fn();
const mockProductCount = vi.fn();

vi.mock("@/db/models", () => ({
  CampaignModel: {
    find: (...args: unknown[]) => mockCampaignFind(...args),
    findOne: (...args: unknown[]) => mockCampaignFindOne(...args),
    create: (...args: unknown[]) => mockCampaignCreate(...args),
  },
  CategoryModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    countDocuments: (...args: unknown[]) => mockCategoryCount(...args),
  },
  BrandModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
  FashionCollectionModel: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
  ProductModel: {
    countDocuments: (...args: unknown[]) => mockProductCount(...args),
  },
}));

describe("CampaignManagementService — Scheduling, Targeting & Activation", () => {
  let service: CampaignManagementService;
  const mockStaff = { _id: "staff-1", email: "marketing@verona.fashion" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CampaignManagementService();
  });

  it("creates a campaign with normalized slug and DRAFT status", async () => {
    mockCampaignFindOne.mockResolvedValue(null);
    mockCampaignCreate.mockResolvedValue({
      _id: "camp-1",
      name: "Mid-Season Sale",
      slug: "mid-season-sale",
      startAt: new Date("2026-10-01"),
      endAt: new Date("2026-10-15"),
      discountConfig: { type: DiscountType.PERCENTAGE, value: 20 },
      toObject: vi.fn().mockReturnValue({}),
    });

    // Mock getCampaignById internal call
    mockCampaignFindOne.mockImplementation((query: { _id?: string }) => {
      if (query._id === "camp-1") {
        return {
          lean: vi.fn().mockResolvedValue({
            _id: "camp-1",
            name: "Mid-Season Sale",
            slug: "mid-season-sale",
            startAt: new Date("2026-10-01"),
            endAt: new Date("2026-10-15"),
            status: CampaignStatus.DRAFT,
            discountConfig: { type: DiscountType.PERCENTAGE, value: 20 },
          }),
        };
      }
      return null;
    });

    const result = await service.createCampaign(
      {
        name: "Mid-Season Sale",
        startAt: "2026-10-01T00:00:00.000Z",
        endAt: "2026-10-15T00:00:00.000Z",
        discountConfig: { type: DiscountType.PERCENTAGE, value: 20 },
      },
      mockStaff
    );

    expect(result.slug).toBe("mid-season-sale");
    expect(result.status).toBe(CampaignStatus.DRAFT);
  });

  it("fails to activate a campaign whose end date is in the past", async () => {
    mockCampaignFindOne.mockResolvedValue({
      _id: "camp-past",
      name: "Past Campaign",
      startAt: new Date("2026-01-01"),
      endAt: new Date("2026-02-01"), // In past
      status: CampaignStatus.DRAFT,
      save: vi.fn(),
    });

    await expect(service.activateCampaign("camp-past", mockStaff)).rejects.toThrow(
      "Cannot activate campaign whose end date is in the past"
    );
  });

  it("fails to activate a campaign if all targeted categories are deleted", async () => {
    const futureEnd = new Date(Date.now() + 86400000 * 5);
    mockCampaignFindOne.mockResolvedValue({
      _id: "camp-targets",
      name: "Targeted Campaign",
      startAt: new Date(),
      endAt: futureEnd,
      targetCategoryIds: ["cat-deleted"],
      status: CampaignStatus.DRAFT,
      save: vi.fn(),
    });
    mockCategoryCount.mockResolvedValue(0); // 0 active categories found

    await expect(service.activateCampaign("camp-targets", mockStaff)).rejects.toThrow(
      "All targeted categories for this campaign are missing or deleted"
    );
  });

  it("activates an eligible campaign and updates status to ACTIVE", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const futureEnd = new Date(Date.now() + 86400000 * 5);
    const mockDoc = {
      _id: "camp-valid",
      name: "Valid Campaign",
      startAt: new Date(),
      endAt: futureEnd,
      status: CampaignStatus.DRAFT,
      save: saveFn,
    };

    mockCampaignFindOne.mockImplementation((query: { _id?: string }) => {
      if (query._id === "camp-valid") {
        if (!mockDoc.save.mock.calls.length) {
          return mockDoc;
        }
        return {
          lean: vi.fn().mockResolvedValue({
            ...mockDoc,
            status: CampaignStatus.ACTIVE,
          }),
        };
      }
      return null;
    });

    const activated = await service.activateCampaign("camp-valid", mockStaff);

    expect(mockDoc.status).toBe(CampaignStatus.ACTIVE);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(activated.status).toBe(CampaignStatus.ACTIVE);
  });

  it("pauses an active campaign", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const mockDoc = {
      _id: "camp-active",
      status: CampaignStatus.ACTIVE,
      save: saveFn,
    };

    mockCampaignFindOne.mockImplementation((query: { _id?: string }) => {
      if (query._id === "camp-active") {
        if (!mockDoc.save.mock.calls.length) {
          return mockDoc;
        }
        return {
          lean: vi.fn().mockResolvedValue({
            _id: "camp-active",
            name: "Active Campaign",
            startAt: new Date(),
            endAt: new Date(Date.now() + 86400000),
            status: CampaignStatus.PAUSED,
            discountConfig: { type: DiscountType.PERCENTAGE, value: 10 },
          }),
        };
      }
      return null;
    });

    const paused = await service.pauseCampaign("camp-active", mockStaff);

    expect(mockDoc.status).toBe(CampaignStatus.PAUSED);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(paused.status).toBe(CampaignStatus.PAUSED);
  });
});
