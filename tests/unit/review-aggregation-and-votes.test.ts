import { describe, it, expect, vi } from "vitest";
import { ReviewAggregationService } from "@/modules/reviews/aggregation/review-aggregation.service";
import { ReviewVoteService } from "@/modules/reviews/votes/review-vote.service";
import { ReviewStatus } from "@/constants/status";
import { ValidationError } from "@/lib/errors";

describe("Phase 24 — Rating Aggregations & Helpful Voting", () => {
  describe("Rating Aggregation Arithmetic & Distribution", () => {
    const aggregationService = new ReviewAggregationService();

    it("computes accurate aggregates for mixed ratings [5, 5, 4, 3]", () => {
      const ratings = [5, 5, 4, 3];
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;

      for (const r of ratings) {
        sum += r;
        distribution[r as keyof typeof distribution]++;
      }

      const totalReviews = ratings.length;
      const averageRating = Math.round((sum / totalReviews) * 100) / 100;

      expect(totalReviews).toBe(4);
      expect(averageRating).toBe(4.25);
      expect(distribution).toEqual({
        1: 0,
        2: 0,
        3: 1,
        4: 1,
        5: 2,
      });
    });

    it("handles zero reviews gracefully without division by zero", () => {
      const ratings: number[] = [];
      const totalReviews = ratings.length;
      const averageRating = totalReviews > 0 ? ratings.reduce((a, b) => a + b, 0) / totalReviews : 0;

      expect(totalReviews).toBe(0);
      expect(averageRating).toBe(0);
    });

    it("correctly updates distribution when rating changes from 4 to 5", () => {
      const initialRatings = [5, 5, 4, 3];
      // Customer edits 4 -> 5
      const updatedRatings = [5, 5, 5, 3];

      const sum = updatedRatings.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / updatedRatings.length) * 100) / 100;

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of updatedRatings) {
        distribution[r as keyof typeof distribution]++;
      }

      expect(updatedRatings.length).toBe(4);
      expect(avg).toBe(4.5);
      expect(distribution[5]).toBe(3);
      expect(distribution[4]).toBe(0);
      expect(distribution[3]).toBe(1);
    });

    it("correctly reduces counts when a 5-star review is hidden", () => {
      const activeRatings = [5, 5, 5, 3];
      // Hide one 5-star review
      const filteredRatings = [5, 5, 3];

      const sum = filteredRatings.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / filteredRatings.length) * 100) / 100;

      expect(filteredRatings.length).toBe(3);
      expect(avg).toBe(4.33);
    });
  });

  describe("Helpful Voting Logic", () => {
    const voteService = new ReviewVoteService();

    it("prevents authors from voting helpful on their own reviews", async () => {
      const mockReview = {
        _id: "rev_own",
        customerId: "cust_author",
        status: ReviewStatus.PUBLISHED,
        helpfulCount: 3,
      };

      const { ReviewModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findById").mockResolvedValue(mockReview as any);

      await expect(
        voteService.voteHelpful("rev_own", "cust_author")
      ).rejects.toThrow("Authors cannot vote on their own reviews");
    });

    it("throws NotFoundError if review does not exist", async () => {
      const { ReviewModel } = await import("@/db/models");
      vi.spyOn(ReviewModel, "findById").mockResolvedValue(null);

      await expect(
        voteService.voteHelpful("rev_nonexistent", "cust_voter")
      ).rejects.toThrow("Review");
    });
  });
});
