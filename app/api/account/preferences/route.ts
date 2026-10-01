import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth";
import { CustomerModel } from "@/db/models";
import { apiSuccess, apiError } from "@/lib/response";
import { ValidationError, normalizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const UpdatePreferencesSchema = z.object({
  marketingEmail: z.boolean().optional(),
  marketingSms: z.boolean().optional(),
  marketingWhatsapp: z.boolean().optional(),
});

/**
 * GET /api/account/preferences
 * Returns the current customer's communication preferences.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    return apiSuccess(customer.preferences, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}

/**
 * PATCH /api/account/preferences
 * Updates communication preferences with boolean validation.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const customer = await requireCustomer();
    const body = await request.json();

    const parseResult = UpdatePreferencesSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        "Invalid preferences parameters",
        parseResult.error.flatten().fieldErrors
      );
    }

    const { marketingEmail, marketingSms, marketingWhatsapp } = parseResult.data;
    const updateObj: Record<string, boolean> = {};

    if (marketingEmail !== undefined) {
      updateObj["preferences.marketingEmail"] = marketingEmail;
    }
    if (marketingSms !== undefined) {
      updateObj["preferences.marketingSms"] = marketingSms;
    }
    if (marketingWhatsapp !== undefined) {
      updateObj["preferences.marketingWhatsapp"] = marketingWhatsapp;
    }

    const updatedCustomer = await CustomerModel.findByIdAndUpdate(
      customer._id,
      { $set: updateObj },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCustomer) {
      throw new ValidationError("Failed to update preferences");
    }

    return apiSuccess(updatedCustomer.preferences, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const appError = normalizeError(error);
    return apiError(appError);
  }
}
