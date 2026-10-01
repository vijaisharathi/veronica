import { describe, it, expect, vi } from "vitest";
import { ReviewService } from "@/modules/reviews/services/review.service";
import { ReviewReportService } from "@/modules/reviews/reports/review-report.service";
import { ReviewStatus, ReviewReportReason, ReviewModerationReason } from "@/constants/status";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

describe("Phase 24 — Review Security, Anti-IDOR & Moderation", () => {
  describe("Anti-IDOR Ownership Protection", () => {
    const reviewService = new ReviewService();

    it("strictly prevents Customer A from updating Customer B's review", async () => {
      const mockReview = {
        _id: "rev_b",
        customerId: "cust_b",
        productId: "prod_1",
        status: ReviewStatus.PUBLISHED,
        rating: 4,
        title: "Original Title",
        comment: "Original content",
      };

      const { ReviewModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findById").mockResolvedValue(mockReview as any);

      await expect(
        reviewService.updateReview("rev_b", "cust_a", {
          title: "Hijacked Title",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("strictly prevents Customer A from deleting Customer B's review", async () => {
      const mockReview = {
        _id: "rev_b",
        customerId: "cust_b",
        status: ReviewStatus.PUBLISHED,
      };

      const { ReviewModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findById").mockResolvedValue(mockReview as any);

      await expect(
        reviewService.deleteReview("rev_b", "cust_a")
      ).rejects.toThrow(ForbiddenError);
    });

    it("formats customer display name correctly for public privacy (Elena R.)", () => {
      const masked1 = reviewService.formatMaskedCustomerName({
        firstName: "Elena",
        lastName: "Rostova",
      });
      expect(masked1).toBe("Elena R.");

      const masked2 = reviewService.formatMaskedCustomerName({
        firstName: "Aria",
      });
      expect(masked2).toBe("Aria");

      const masked3 = reviewService.formatMaskedCustomerName({});
      expect(masked3).toBe("Verified Buyer");
    });
  });

  describe("Abuse Reporting & Deduplication", () => {
    const reportService = new ReviewReportService();

    it("prevents author from reporting their own review", async () => {
      const mockReview = {
        _id: "rev_own",
        customerId: "cust_author",
        status: ReviewStatus.PUBLISHED,
      };

      const { ReviewModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findById").mockResolvedValue(mockReview as any);

      await expect(
        reportService.submitReport("rev_own", "cust_author", {
          reason: ReviewReportReason.SPAM,
          comment: "Self report",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("prevents multiple reports from the same customer on the same review (E11000 duplicate key)", async () => {
      const mockReview = {
        _id: "rev_1",
        customerId: "cust_other",
        status: ReviewStatus.PUBLISHED,
      };

      const { ReviewModel, ReviewReportModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findById").mockResolvedValue(mockReview as any);
      vi.spyOn(ReviewReportModel, "create").mockRejectedValue({ code: 11000 });

      await expect(
        reportService.submitReport("rev_1", "cust_reporter", {
          reason: ReviewReportReason.SPAM,
          comment: "Repeated spam links",
        })
      ).rejects.toThrow(ConflictError);
    });
  });
});
