import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReviewStatus } from "@/constants/status";
import {
  canTransitionReview,
  assertValidReviewTransition,
  isPubliclyVisibleReviewStatus,
  doesReviewStatusContributeToAggregates,
} from "@/modules/reviews/state-machine/review-state-machine";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  sanitizeText,
} from "@/modules/reviews/validators/review.validators";
import { ReviewEligibilityService } from "@/modules/reviews/eligibility/review-eligibility.service";
import { OrderStatus } from "@/constants/status";

describe("Phase 24 — Review State Machine & Validators", () => {
  describe("Review State Machine Transitions", () => {
    it("allows legal transitions from PENDING", () => {
      expect(canTransitionReview(ReviewStatus.PENDING, ReviewStatus.PUBLISHED)).toBe(true);
      expect(canTransitionReview(ReviewStatus.PENDING, ReviewStatus.REJECTED)).toBe(true);
      expect(canTransitionReview(ReviewStatus.PENDING, ReviewStatus.DELETED)).toBe(true);
      expect(() => assertValidReviewTransition(ReviewStatus.PENDING, ReviewStatus.PUBLISHED)).not.toThrow();
    });

    it("allows legal transitions from PUBLISHED", () => {
      expect(canTransitionReview(ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN)).toBe(true);
      expect(canTransitionReview(ReviewStatus.PUBLISHED, ReviewStatus.REJECTED)).toBe(true);
      expect(canTransitionReview(ReviewStatus.PUBLISHED, ReviewStatus.DELETED)).toBe(true);
    });

    it("allows legal restoration from HIDDEN or REJECTED to PUBLISHED", () => {
      expect(canTransitionReview(ReviewStatus.HIDDEN, ReviewStatus.PUBLISHED)).toBe(true);
      expect(canTransitionReview(ReviewStatus.REJECTED, ReviewStatus.PUBLISHED)).toBe(true);
    });

    it("prevents transitions out of terminal DELETED state", () => {
      expect(canTransitionReview(ReviewStatus.DELETED, ReviewStatus.PUBLISHED)).toBe(false);
      expect(canTransitionReview(ReviewStatus.DELETED, ReviewStatus.PENDING)).toBe(false);
      expect(canTransitionReview(ReviewStatus.DELETED, ReviewStatus.HIDDEN)).toBe(false);
      expect(() => assertValidReviewTransition(ReviewStatus.DELETED, ReviewStatus.PUBLISHED)).toThrow();
    });

    it("correctly identifies publicly visible statuses", () => {
      expect(isPubliclyVisibleReviewStatus(ReviewStatus.PUBLISHED)).toBe(true);
      expect(isPubliclyVisibleReviewStatus(ReviewStatus.PENDING)).toBe(false);
      expect(isPubliclyVisibleReviewStatus(ReviewStatus.REJECTED)).toBe(false);
      expect(isPubliclyVisibleReviewStatus(ReviewStatus.HIDDEN)).toBe(false);
      expect(isPubliclyVisibleReviewStatus(ReviewStatus.DELETED)).toBe(false);
    });

    it("correctly identifies statuses contributing to aggregates", () => {
      expect(doesReviewStatusContributeToAggregates(ReviewStatus.PUBLISHED)).toBe(true);
      expect(doesReviewStatusContributeToAggregates(ReviewStatus.PENDING)).toBe(false);
      expect(doesReviewStatusContributeToAggregates(ReviewStatus.REJECTED)).toBe(false);
      expect(doesReviewStatusContributeToAggregates(ReviewStatus.HIDDEN)).toBe(false);
      expect(doesReviewStatusContributeToAggregates(ReviewStatus.DELETED)).toBe(false);
    });
  });

  describe("Rating & Content Validation", () => {
    it("accepts valid 1-5 integer ratings", () => {
      for (const r of [1, 2, 3, 4, 5]) {
        const result = CreateReviewSchema.safeParse({
          productId: "64b8f0000000000000000001",
          rating: r,
          title: "Stunning Silk Drape",
          comment: "Exceptional garment craftsmanship and precise fit.",
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects ratings outside 1-5 and non-integers", () => {
      const invalidRatings = [0, 6, -1, 4.5, 2.3, 10];
      for (const r of invalidRatings) {
        const result = CreateReviewSchema.safeParse({
          productId: "64b8f0000000000000000001",
          rating: r,
          title: "Test Title",
          comment: "Valid comment text here.",
        });
        expect(result.success).toBe(false);
      }
    });

    it("rejects title or comment that are empty or too long", () => {
      const emptyComment = CreateReviewSchema.safeParse({
        productId: "64b8f0000000000000000001",
        rating: 5,
        title: "Good",
        comment: "",
      });
      expect(emptyComment.success).toBe(false);

      const hugeTitle = "A".repeat(151);
      const invalidTitle = CreateReviewSchema.safeParse({
        productId: "64b8f0000000000000000001",
        rating: 5,
        title: hugeTitle,
        comment: "Valid text",
      });
      expect(invalidTitle.success).toBe(false);
    });

    it("sanitizes HTML and script tags to prevent XSS", () => {
      const malicious = '<script>alert("XSS")</script>Beautiful dress <style>body{color:red}</style>';
      const cleaned = sanitizeText(malicious);
      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("alert");
      expect(cleaned).toContain("Beautiful dress");
    });
  });

  describe("Review Eligibility Service — Verified Purchase Policy", () => {
    const eligibilityService = new ReviewEligibilityService();

    it("identifies delivered order items as eligible for review", async () => {
      const mockOrder = {
        _id: "order_123",
        orderNumber: "ORD-9999",
        customerId: "cust_1",
        status: OrderStatus.DELIVERED,
        items: [
          {
            _id: "item_1",
            productId: "prod_1",
            variantId: "var_1",
            color: "Midnight Black",
            size: "M",
          },
        ],
        deliveredAt: new Date(),
      };

      const { ReviewModel, OrderModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      vi.spyOn(OrderModel, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockOrder]),
        }),
      } as any);

      const res = await eligibilityService.evaluateEligibility("cust_1", "prod_1");
      expect(res.isEligible).toBe(true);
      expect(res.alreadyReviewed).toBe(false);
      expect(res.orderNumber).toBe("ORD-9999");
      expect(res.variantSnapshot?.size).toBe("M");
    });

    it("rejects eligibility if customer has already submitted an active review", async () => {
      const mockExistingReview = {
        _id: "rev_existing",
        status: ReviewStatus.PUBLISHED,
      };

      const { ReviewModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockExistingReview),
      } as any);

      const res = await eligibilityService.evaluateEligibility("cust_1", "prod_1");
      expect(res.isEligible).toBe(false);
      expect(res.alreadyReviewed).toBe(true);
      expect(res.ineligibleReason).toContain("already reviewed");
    });

    it("rejects eligibility if order is not delivered (undelivered policy)", async () => {
      const { ReviewModel, OrderModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      vi.spyOn(OrderModel, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const res = await eligibilityService.evaluateEligibility("cust_1", "prod_1");
      expect(res.isEligible).toBe(false);
      expect(res.ineligibleReason).toContain("delivered order");
    });
  });
});
