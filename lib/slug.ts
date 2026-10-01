/**
 * VÉRONA — Centralized Slug Normalization & Validation
 *
 * Ensures deterministic, lowercase, URL-safe slugs across the platform.
 */

/**
 * Normalizes an arbitrary string into a clean URL-safe slug.
 * Example: "Classic Oversized Cotton T-Shirt!" -> "classic-oversized-cotton-t-shirt"
 */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // Collapse whitespace and underscore into hyphen
    .replace(/^-+|-+$/g, ""); // Trim leading and trailing hyphens
}

/**
 * Validates whether a slug matches the canonical URL-safe pattern.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 200) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
