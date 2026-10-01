/**
 * VÉRONA — Review Input Validators & Security Sanitizers (Phase 24)
 *
 * Enforces strict input validation, length bounds, integer rating constraints,
 * and XSS / script injection prevention.
 */

import { z } from "zod";
import {
  ReviewStatus,
  ReviewReportReason,
  ReviewReportStatus,
  ReviewModerationReason,
} from "@/constants/status";

/**
 * Sanitizes user-submitted text by stripping HTML tags and dangerous characters.
 * Prevents stored XSS, HTML injection, and script execution.
 */
export function sanitizeReviewText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "") // Strip script tags and content
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "") // Strip style tags and content
    .replace(/<[^>]*>?/gm, "") // Strip any remaining HTML tags
    .replace(/javascript:/gi, "") // Strip javascript pseudo-protocol
    .replace(/data:/gi, "") // Strip data URLs
    .replace(/[<>]/g, "") // Strip raw angle brackets
    .trim();
}

export const sanitizeText = sanitizeReviewText;

export const ReviewMediaItemSchema = z.object({
  url: z
    .string()
    .url("Media URL must be a valid URL")
    .startsWith("https://", "Media URL must use secure HTTPS")
    .max(500, "Media URL is too long"),
  mediaType: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  sortOrder: z.number().int().min(0).max(10).default(0),
});

export const CreateReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  rating: z
    .number({ required_error: "Rating is required" })
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  title: z
    .string({ required_error: "Review title is required" })
    .transform(sanitizeReviewText)
    .pipe(
      z
        .string()
        .min(2, "Review title must be at least 2 characters")
        .max(120, "Review title cannot exceed 120 characters")
    ),
  comment: z
    .string({ required_error: "Review comment is required" })
    .transform(sanitizeReviewText)
    .pipe(
      z
        .string()
        .min(10, "Review content must be at least 10 characters")
        .max(2000, "Review content cannot exceed 2,000 characters")
    ),
  orderId: z.string().optional(),
  orderItemId: z.string().optional(),
  variantId: z.string().optional(),
  media: z
    .array(ReviewMediaItemSchema)
    .max(5, "A maximum of 5 media items are permitted per review")
    .optional()
    .default([]),
});

export const UpdateReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars")
    .optional(),
  title: z
    .string()
    .transform(sanitizeReviewText)
    .pipe(
      z
        .string()
        .min(2, "Review title must be at least 2 characters")
        .max(120, "Review title cannot exceed 120 characters")
    )
    .optional(),
  comment: z
    .string()
    .transform(sanitizeReviewText)
    .pipe(
      z
        .string()
        .min(10, "Review content must be at least 10 characters")
        .max(2000, "Review content cannot exceed 2,000 characters")
    )
    .optional(),
  media: z
    .array(ReviewMediaItemSchema)
    .max(5, "A maximum of 5 media items are permitted per review")
    .optional(),
});

export const CreateReportSchema = z.object({
  reason: z.nativeEnum(ReviewReportReason, {
    required_error: "Report reason is required",
  }),
  comment: z
    .string()
    .transform(sanitizeReviewText)
    .pipe(z.string().max(500, "Report explanation cannot exceed 500 characters"))
    .optional(),
});

export const ModerateReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus, {
    required_error: "Target status is required",
  }),
  reason: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const ResolveReportSchema = z.object({
  status: z.nativeEnum(ReviewReportStatus, {
    required_error: "Resolution status is required",
  }),
  resolutionNotes: z.string().max(1000).optional(),
  actionTaken: z.enum(["HIDE_REVIEW", "DISMISS_REPORT", "NO_ACTION"]).default("NO_ACTION"),
});
