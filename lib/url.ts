/**
 * VÉRONA — URL Sanitization & Safe Redirect Utilities
 *
 * Prevents Open Redirect vulnerabilities (CWE-601) by ensuring that any
 * client-supplied return URL is strictly a relative internal path.
 */

/**
 * Validates and sanitizes a return/redirect URL.
 * Rejects absolute URLs with schemes, protocol-relative URLs (`//`),
 * backslash tricks (`/\` or `\\`), and non-printable characters.
 *
 * @param url Candidate redirect URL
 * @param fallback Safe default internal route (defaults to "/")
 * @returns Safe relative internal URL
 */
export function sanitizeReturnUrl(url?: string | null, fallback = "/"): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();

  // Must begin with a single leading slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Reject protocol-relative URLs (e.g. "//evil.com")
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject backslash obfuscation (e.g. "/\evil.com" or "/\\evil.com")
  if (trimmed.startsWith("/\\") || trimmed.includes("\\")) {
    return fallback;
  }

  // Reject any embedded colon before the query string or fragment (e.g. "/javascript:alert(1)")
  const pathPart = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (pathPart.includes(":")) {
    return fallback;
  }

  // Reject newline / carriage return characters (CRLF injection)
  if (/[\r\n\t]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
