/**
 * VÉRONA — Support Attachment Validation & Security Service (Phase 26)
 *
 * Enforces file size limits, MIME type whitelisting, extension validation,
 * and malicious payload rejection for customer and agent support uploads.
 */

import { ValidationError } from "@/lib/errors";
import { SupportAttachmentDTO } from "../types/support.types";

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const FORBIDDEN_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".js",
  ".ts",
  ".html",
  ".htm",
  ".svg",
  ".vbs",
  ".scr",
]);

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export class SupportAttachmentService {
  /**
   * Validates an array of attachment objects prior to persisting them in a support message.
   */
  validateAttachments(attachments: SupportAttachmentDTO[]): void {
    if (!attachments || attachments.length === 0) return;

    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new ValidationError(
        `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments permitted per support message.`
      );
    }

    for (const att of attachments) {
      if (!att.name || !att.url) {
        throw new ValidationError("Attachment must possess a valid name and URL.");
      }

      if (att.fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new ValidationError(
          `Attachment '${att.name}' exceeds the maximum allowed file size of 10MB.`
        );
      }

      if (att.fileType && !ALLOWED_MIME_TYPES.has(att.fileType.toLowerCase())) {
        throw new ValidationError(
          `Unsupported file type '${att.fileType}'. Permitted types: JPEG, PNG, WebP, PDF.`
        );
      }

      const lowerName = att.name.toLowerCase();
      for (const ext of FORBIDDEN_EXTENSIONS) {
        if (lowerName.endsWith(ext)) {
          throw new ValidationError(
            `File extension '${ext}' is strictly prohibited for security reasons.`
          );
        }
      }

      // Security: enforce https scheme
      if (!att.url.startsWith("https://")) {
        throw new ValidationError("Attachment URLs must use secure HTTPS transport.");
      }
    }
  }
}

export const supportAttachmentService = new SupportAttachmentService();
