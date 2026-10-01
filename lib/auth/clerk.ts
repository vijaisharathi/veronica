/**
 * VÉRONA — Clerk Authentication Integration Layer
 *
 * Secure server-side interface to Clerk Authentication.
 * Handles Clerk session extraction and identity verification.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";

export interface ClerkAuthIdentity {
  userId: string;
  sessionId: string;
}

export interface ClerkUserSnapshot {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  emailVerified: boolean;
}

/**
 * Checks if Clerk authentication credentials are configured in the current environment.
 */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

/**
 * Resolves current authenticated session identity server-side.
 * Returns null if the request is unauthenticated or Clerk is unconfigured.
 */
export async function getClerkSession(): Promise<ClerkAuthIdentity | null> {
  if (!isClerkConfigured()) {
    return null;
  }

  try {
    const { userId, sessionId } = await auth();
    if (!userId || !sessionId) {
      return null;
    }
    return { userId, sessionId };
  } catch (error: unknown) {
    logger.warn(
      "Clerk session extraction failed",
      { error: error instanceof Error ? error.message : String(error) },
      "Authentication"
    );
    return null;
  }
}

/**
 * Resolves detailed Clerk user snapshot for profile synchronization.
 */
export async function getClerkUser(): Promise<ClerkUserSnapshot | null> {
  if (!isClerkConfigured()) {
    return null;
  }

  try {
    const user = await currentUser();
    if (!user) {
      return null;
    }

    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";

    const primaryPhone = user.phoneNumbers.find(
      (p) => p.id === user.primaryPhoneNumberId
    )?.phoneNumber ?? user.phoneNumbers[0]?.phoneNumber ?? null;

    const emailVerified = user.emailAddresses.some(
      (e) => e.emailAddress === primaryEmail && e.verification?.status === "verified"
    );

    return {
      id: user.id,
      email: primaryEmail.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      phone: primaryPhone,
      emailVerified,
    };
  } catch (error: unknown) {
    logger.warn(
      "Clerk user details resolution failed",
      { error: error instanceof Error ? error.message : String(error) },
      "Authentication"
    );
    return null;
  }
}
