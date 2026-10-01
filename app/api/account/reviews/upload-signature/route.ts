/**
 * VÉRONA — Review Media Upload Signature API Route
 *
 * GET /api/account/reviews/upload-signature
 * Generates an authorized, cryptographic upload ticket for client-side Cloudinary upload.
 * Secrets are never exposed to the client.
 */

import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/response";
import { normalizeError } from "@/lib/errors";
import { reviewMediaService } from "@/modules/reviews";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET() {
  try {
    const customer = await requireCustomer();
    const signatureData = reviewMediaService.generateUploadSignature(
      customer._id.toString()
    );

    return apiSuccess(signatureData, { headers: PRIVATE_CACHE_HEADERS });
  } catch (error: unknown) {
    return apiError(normalizeError(error));
  }
}
