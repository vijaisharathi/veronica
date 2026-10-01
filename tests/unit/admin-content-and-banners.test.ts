/**
 * VÉRONA — Admin Content Hub, Banners & Editorial Tests (Phase 28)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentManagementService } from "@/modules/content/content-management.service";
import { ConflictError, ValidationError, NotFoundError } from "@/lib/errors";

vi.mock("@/db/client", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAuditTrail: vi.fn().mockResolvedValue(undefined),
}));

const mockBannerFind = vi.fn();
const mockBannerFindById = vi.fn();
const mockBannerCreate = vi.fn();

const mockSectionFind = vi.fn();
const mockSectionCount = vi.fn();
const mockSectionInsertMany = vi.fn();
const mockSectionBulkWrite = vi.fn();
const mockSectionFindById = vi.fn();

const mockEditorialFind = vi.fn();
const mockEditorialFindOne = vi.fn();
const mockEditorialFindById = vi.fn();
const mockEditorialCreate = vi.fn();

vi.mock("@/db/models", () => ({
  BannerModel: {
    find: (...args: unknown[]) => mockBannerFind(...args),
    findById: (...args: unknown[]) => mockBannerFindById(...args),
    create: (...args: unknown[]) => mockBannerCreate(...args),
    findByIdAndDelete: vi.fn().mockResolvedValue({ _id: "b-1" }),
  },
  HomepageSectionModel: {
    find: (...args: unknown[]) => mockSectionFind(...args),
    countDocuments: (...args: unknown[]) => mockSectionCount(...args),
    insertMany: (...args: unknown[]) => mockSectionInsertMany(...args),
    bulkWrite: (...args: unknown[]) => mockSectionBulkWrite(...args),
    findById: (...args: unknown[]) => mockSectionFindById(...args),
  },
  EditorialStoryModel: {
    find: (...args: unknown[]) => {
      const res = mockEditorialFind(...args);
      return {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(Array.isArray(res) ? res : []),
      };
    },
    findOne: (...args: unknown[]) => mockEditorialFindOne(...args),
    findById: (...args: unknown[]) => mockEditorialFindById(...args),
    create: (...args: unknown[]) => mockEditorialCreate(...args),
  },
}));

describe("ContentManagementService — Banner Scheduling Windows", () => {
  let service: ContentManagementService;
  const mockStaff = { _id: "staff-1", email: "content@verona.fashion" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentManagementService();
  });

  it("evaluates isCurrentlyActive accurately against live timestamp", async () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const pastDate = new Date("2026-09-01T12:00:00Z");
    const futureDate = new Date("2026-11-01T12:00:00Z");

    const mockBanners = [
      {
        _id: "b-active",
        title: "Active Banner",
        active: true,
        startAt: pastDate,
        endAt: futureDate,
        placement: "HOMEPAGE_TOP",
      },
      {
        _id: "b-scheduled",
        title: "Future Banner",
        active: true,
        startAt: futureDate,
        endAt: new Date("2026-12-01T12:00:00Z"),
        placement: "HOMEPAGE_TOP",
      },
      {
        _id: "b-expired",
        title: "Past Banner",
        active: true,
        startAt: new Date("2026-08-01T12:00:00Z"),
        endAt: pastDate,
        placement: "HOMEPAGE_TOP",
      },
    ];

    mockBannerFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockBanners),
    });

    // Mock Date globally during test
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const list = await service.listBanners("HOMEPAGE_TOP");

    expect(list.find((b) => b.id === "b-active")?.isCurrentlyActive).toBe(true);
    expect(list.find((b) => b.id === "b-scheduled")?.isCurrentlyActive).toBe(false);
    expect(list.find((b) => b.id === "b-expired")?.isCurrentlyActive).toBe(false);

    vi.useRealTimers();
  });
});

describe("ContentManagementService — Homepage Sections", () => {
  let service: ContentManagementService;
  const mockStaff = { _id: "staff-1", email: "content@verona.fashion" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentManagementService();
  });

  it("auto-seeds canonical default sections if database collection is empty", async () => {
    mockSectionCount.mockResolvedValue(0);
    mockSectionInsertMany.mockResolvedValue([]);
    mockSectionFind
      .mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "sec-1",
            sectionType: "HERO",
            title: "Winter Atelier 2026",
            sortOrder: 0,
            isVisible: true,
          },
        ]),
      });

    const sections = await service.listSections();

    expect(mockSectionInsertMany).toHaveBeenCalledTimes(1);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]?.sectionType).toBe("HERO");
  });

  it("reorders homepage sections sequentially", async () => {
    mockSectionBulkWrite.mockResolvedValue({ ok: 1 });

    const result = await service.reorderSections(["sec-3", "sec-1", "sec-2"], mockStaff);

    expect(result).toBe(true);
    expect(mockSectionBulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: "sec-3" }, update: { $set: { sortOrder: 0 } } } },
      { updateOne: { filter: { _id: "sec-1" }, update: { $set: { sortOrder: 1 } } } },
      { updateOne: { filter: { _id: "sec-2" }, update: { $set: { sortOrder: 2 } } } },
    ]);
  });
});

describe("ContentManagementService — Editorial Stories", () => {
  let service: ContentManagementService;
  const mockStaff = { _id: "staff-1", email: "content@verona.fashion" } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentManagementService();
  });

  it("creates an editorial story and estimates reading time", async () => {
    mockEditorialFindOne.mockResolvedValue(null);
    mockEditorialFind.mockReturnValue([
      {
        _id: "story-1",
        title: "Mulberry Silk Heritage",
        slug: "mulberry-silk-heritage",
        content: "This is a detailed craftsmanship story about Italian silk weaving.".repeat(30),
        status: "DRAFT",
        readingTimeMinutes: 2,
      },
    ]);
    mockEditorialCreate.mockResolvedValue({
      _id: "story-1",
      title: "Mulberry Silk Heritage",
      slug: "mulberry-silk-heritage",
      content: "This is a detailed craftsmanship story about Italian silk weaving.".repeat(30),
      status: "DRAFT",
      readingTimeMinutes: 2,
      toObject: vi.fn().mockReturnValue({}),
    });
    mockEditorialFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "story-1",
        title: "Mulberry Silk Heritage",
        slug: "mulberry-silk-heritage",
        content: "This is a detailed craftsmanship story about Italian silk weaving.".repeat(30),
        status: "DRAFT",
        readingTimeMinutes: 2,
      }),
    });

    const story = await service.createEditorialStory(
      {
        title: "Mulberry Silk Heritage",
        content: "This is a detailed craftsmanship story about Italian silk weaving.".repeat(30),
      },
      mockStaff
    );

    expect(story.slug).toBe("mulberry-silk-heritage");
    expect(story.status).toBe("DRAFT");
    expect(story.readingTimeMinutes).toBeGreaterThan(0);
  });
});
