/**
 * VÉRONA — Admin Media Validation API Route (Phase 28)
 *
 * POST /api/admin/media/validate — Validate image URL, MIME type, file size and alt text
 */

import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/response";
import { mediaService, MediaAssetValidationInput } from "@/modules/catalog/media.service";
import { validateRequestBody } from "@/lib/validation";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MediaValidationSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  alt: z.string().max(200).optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireStaff();

    const body = await validateRequestBody(request, MediaValidationSchema);
    mediaService.validateMedia(body as MediaAssetValidationInput);

    return apiSuccess({ valid: true });
  } catch (error) {
    return apiError(error);
  }
}
