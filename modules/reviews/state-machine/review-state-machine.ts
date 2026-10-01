/**
 * VÉRONA — Review State Machine (Phase 24)
 *
 * Defines authoritative status lifecycle transitions for customer reviews.
 * Enforces legal transitions, terminal states, and aggregate impact flags.
 */

import { ReviewStatus } from "@/constants/status";
import { AppError } from "@/lib/errors";

export class InvalidReviewStateTransitionError extends AppError {
  constructor(from: ReviewStatus, to: ReviewStatus) {
    super(
      `Invalid review transition from ${from} to ${to}`,
      "INVALID_REVIEW_TRANSITION",
      400
    );
  }
}

/**
 * Legal transition graph: Map of current status to set of permissible target statuses.
 */
export const LEGAL_REVIEW_TRANSITIONS: Record<ReviewStatus, readonly ReviewStatus[]> = {
  [ReviewStatus.PENDING]: [
    ReviewStatus.PUBLISHED,
    ReviewStatus.APPROVED, // alias for published
    ReviewStatus.REJECTED,
    ReviewStatus.DELETED,
  ],
  [ReviewStatus.APPROVED]: [
    ReviewStatus.PUBLISHED,
    ReviewStatus.HIDDEN,
    ReviewStatus.REJECTED,
    ReviewStatus.DELETED,
  ],
  [ReviewStatus.PUBLISHED]: [
    ReviewStatus.HIDDEN,
    ReviewStatus.REJECTED,
    ReviewStatus.DELETED,
  ],
  [ReviewStatus.HIDDEN]: [
    ReviewStatus.PUBLISHED,
    ReviewStatus.DELETED,
  ],
  [ReviewStatus.REJECTED]: [
    ReviewStatus.PUBLISHED, // Admin override upon appeal/reconsideration
    ReviewStatus.DELETED,
  ],
  [ReviewStatus.DELETED]: [], // Terminal state
};

export class ReviewStateMachine {
  /**
   * Validates whether a proposed transition is permissible under canonical policy.
   */
  static canTransition(from: ReviewStatus, to: ReviewStatus): boolean {
    if (from === to) return true;
    const allowed = LEGAL_REVIEW_TRANSITIONS[from];
    return Boolean(allowed && allowed.includes(to));
  }

  /**
   * Asserts transition validity, throwing InvalidReviewStateTransitionError if illegal.
   */
  static assertCanTransition(from: ReviewStatus, to: ReviewStatus): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidReviewStateTransitionError(from, to);
    }
  }

  /**
   * Returns true if the status is public-facing and visible on product pages.
   */
  static isPubliclyVisible(status: ReviewStatus): boolean {
    return status === ReviewStatus.PUBLISHED || status === ReviewStatus.APPROVED;
  }

  /**
   * Returns true if the status must be counted in rating aggregates and distribution.
   */
  static contributesToAggregates(status: ReviewStatus): boolean {
    return status === ReviewStatus.PUBLISHED || status === ReviewStatus.APPROVED;
  }

  /**
   * Returns true if the review is in a terminal deleted state.
   */
  static isTerminal(status: ReviewStatus): boolean {
    return status === ReviewStatus.DELETED;
  }
}

export const canTransitionReview = ReviewStateMachine.canTransition.bind(ReviewStateMachine);
export const assertValidReviewTransition = ReviewStateMachine.assertCanTransition.bind(ReviewStateMachine);
export const isPubliclyVisibleReviewStatus = ReviewStateMachine.isPubliclyVisible.bind(ReviewStateMachine);
export const doesReviewStatusContributeToAggregates = ReviewStateMachine.contributesToAggregates.bind(ReviewStateMachine);

