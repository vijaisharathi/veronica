/**
 * VÉRONA — Media Asset Domain Service (Phase 28)
 *
 * Validates product and campaign media assets, ensures MIME-type compliance,
 * enforces accessibility alt text guidelines, and prevents storing large
 * binary blobs directly in MongoDB.
 */

import { ValidationError } from "@/lib/errors";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface MediaAssetValidationInput {
  url: string;
  alt?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export class MediaService {
  /**
   * Validates a media asset URL and optional metadata before persistence.
   */
  validateMedia(asset: MediaAssetValidationInput): void {
    if (!asset.url || typeof asset.url !== "string") {
      throw new ValidationError("Media asset must have a valid URL");
    }

    let parsed: URL;
    try {
      parsed = new URL(asset.url);
    } catch {
      throw new ValidationError(`Invalid media URL format: '${asset.url}'`);
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new ValidationError("Media URL must use a secure protocol (https)");
    }

    if (asset.mimeType && !ALLOWED_MIME_TYPES.has(asset.mimeType.toLowerCase())) {
      throw new ValidationError(
        `Unsupported media MIME type: '${asset.mimeType}'. Allowed: JPEG, PNG, WebP, AVIF`
      );
    }

    if (asset.sizeBytes && asset.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds maximum allowed limit of 5 MB (received ${(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`
      );
    }

    if (asset.alt && asset.alt.length > 200) {
      throw new ValidationError("Alt text must not exceed 200 characters");
    }
  }

  /**
   * Validates an array of product images with primary selector check.
   */
  validateProductGallery(
    images: Array<{ url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }>
  ): void {
    if (!Array.isArray(images) || images.length === 0) {
      throw new ValidationError("Product must include at least one gallery image");
    }

    for (const img of images) {
      this.validateMedia({ url: img.url, alt: img.alt });
    }

    const primaryCount = images.filter((i) => i.isPrimary).length;
    if (primaryCount > 1) {
      throw new ValidationError("Product gallery cannot have more than one primary image");
    }
  }
}

export const mediaService = new MediaService();
