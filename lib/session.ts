import { cookies } from "next/headers";
import { getCurrentCustomer } from "@/lib/auth/session";
import { ViewerIdentity } from "@/db/repositories/recently-viewed.repository";

export const SESSION_COOKIE_NAME = "verona_session_id";

/**
 * Resolves the active viewer identity (Customer ID if authenticated, else anonymous Session ID).
 */
export async function getViewerIdentity(): Promise<{
  identity: ViewerIdentity;
  newSessionId?: string;
  guestSessionId?: string;
}> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const validExistingCookie =
    existingCookie && /^[a-zA-Z0-9_-]{16,64}$/.test(existingCookie)
      ? existingCookie
      : undefined;

  // 1. Check if authenticated customer
  const customer = await getCurrentCustomer();
  if (customer) {
    return {
      identity: { customerId: customer._id.toString() },
      guestSessionId: validExistingCookie,
    };
  }

  // 2. Fall back to guest session ID from cookie
  if (validExistingCookie) {
    return {
      identity: { sessionId: validExistingCookie },
    };
  }

  // Generate a clean crypto random UUID session identifier
  const newSessionId = crypto.randomUUID();
  return {
    identity: { sessionId: newSessionId },
    newSessionId,
  };
}
