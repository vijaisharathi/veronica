import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * VÉRONA — Core Edge Middleware Foundation
 *
 * Establishes:
 * 1. Request correlation tracking via `x-request-id` header
 * 2. Foundational HTTP security headers (OWASP baseline)
 * 3. Route matching boundaries for future storefront and admin protection
 *
 * Note: No fake authentication or RBAC checks are implemented here (deferred to Phase 05/06).
 */
export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  // Clone response or proceed with next handler
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Attach correlation ID to request and response
  response.headers.set("x-request-id", requestId);

  // Security Baseline & Hardening Headers (OWASP Production Baseline)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Content-Security-Policy compatible with Next.js, Clerk, Razorpay, Unsplash, Cloudinary
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.clerk.com https://img.clerk.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
