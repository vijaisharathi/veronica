/**
 * VÉRONA — Search Query Normalizer & Synonyms
 *
 * Implements safe Unicode normalization, whitespace collapsing,
 * injection stripping, fashion synonym expansion, and SKU format detection.
 */

import { NormalizedSearchQuery } from "./search.types";

/**
 * Centralized, deterministic fashion domain synonym mapping.
 * Expands or normalizes colloquial user terms to canonical product types.
 */
export const FASHION_SYNONYMS: Record<string, string> = {
  tee: "t-shirt",
  tees: "t-shirt",
  tshirt: "t-shirt",
  tshirts: "t-shirt",
  denim: "jeans",
  denims: "jeans",
  trouser: "trousers",
  pant: "trousers",
  pants: "trousers",
  slacks: "trousers",
  suit: "blazer",
  suits: "blazer",
  jacket: "blazer",
  overcoat: "trench coat",
  coat: "jacket",
  gown: "dress",
  gowns: "dress",
  frock: "dress",
  churidar: "kurta",
  sherwani: "kurta",
  kurti: "kurta",
  sari: "saree",
  saris: "saree",
  shawl: "stole",
  dupatta: "stole",
  khadi: "handwoven",
};

/**
 * Curated target vocabulary for typo detection and "Did you mean" suggestions.
 */
export const FASHION_VOCABULARY: string[] = [
  "oversized",
  "cashmere",
  "blazer",
  "t-shirt",
  "trousers",
  "linen",
  "cotton",
  "mulberry",
  "silk",
  "kurta",
  "saree",
  "jacket",
  "dress",
  "chinos",
  "handwoven",
  "wool",
  "merino",
  "evening",
  "tailored",
  "tuxedo",
  "pleated",
  "poplin",
];

/**
 * Curated discovery queries shown in idle/empty states.
 * Transparently labeled as curated atelier discovery terms.
 */
export const CURATED_DISCOVERY_TERMS: string[] = [
  "Mulberry Silk",
  "Handwoven Kurta",
  "Artisanal Blazer",
  "Linen Silhouettes",
  "Evening Gown",
  "Organic Cotton Chino",
];

const MAX_QUERY_LENGTH = 100;

/**
 * Check if a string matches the canonical SKU pattern (e.g. VER-TSH-001)
 */
export function isExactSkuPattern(query: string): boolean {
  return /^VER-[A-Z0-9-]+$/i.test(query.trim());
}

/**
 * Expands a list of tokens using the centralized fashion synonyms dictionary.
 */
export function expandSynonyms(tokens: string[]): string[] {
  const set = new Set<string>();
  for (const token of tokens) {
    set.add(token);
    const syn = FASHION_SYNONYMS[token.toLowerCase()];
    if (syn) {
      for (const s of syn.split(/\s+/)) {
        set.add(s);
      }
    }
  }
  return Array.from(set);
}

/**
 * Simple, efficient Levenshtein distance calculator for typo correction
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const bLen = b.length;
  const aLen = a.length;

  const matrix: number[][] = Array.from({ length: bLen + 1 }, () =>
    new Array<number>(aLen + 1).fill(0)
  );

  for (let i = 0; i <= bLen; i++) {
    const row = matrix[i];
    if (row) row[0] = i;
  }

  const firstRow = matrix[0];
  if (firstRow) {
    for (let j = 0; j <= aLen; j++) {
      firstRow[j] = j;
    }
  }

  for (let i = 1; i <= bLen; i++) {
    const prevRow = matrix[i - 1];
    const currRow = matrix[i];
    if (!prevRow || !currRow) continue;

    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        currRow[j] = prevRow[j - 1] ?? 0;
      } else {
        const sub = prevRow[j - 1] ?? 0;
        const ins = prevRow[j] ?? 0;
        const del = currRow[j - 1] ?? 0;
        currRow[j] = Math.min(sub + 1, ins + 1, del + 1);
      }
    }
  }

  return matrix[bLen]?.[aLen] ?? 0;
}

/**
 * Normalizes an arbitrary search query string for safe query execution and ranking.
 */
export function normalizeSearchQuery(rawQuery?: string | null): NormalizedSearchQuery {
  if (!rawQuery) {
    return {
      raw: "",
      normalized: "",
      tokens: [],
      expandedTerms: [],
      isExactSkuMatch: false,
    };
  }

  const rawTrimmed = rawQuery.trim();

  // 1. Unicode normalization (NFKC decomposes compatibility chars and recomposes canonically)
  let cleaned = rawTrimmed.normalize("NFKC");

  // 2. Strip potential HTML tags and script injection attempts
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // 3. Strip unsafe database operator characters while preserving letters, numbers, spaces, hyphens
  cleaned = cleaned.replace(/[{}\[\]$^*+=|\\~`]/g, " ");

  // 4. Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // 5. Cap maximum character length to prevent buffer/regex denial of service
  if (cleaned.length > MAX_QUERY_LENGTH) {
    cleaned = cleaned.slice(0, MAX_QUERY_LENGTH).trim();
  }

  // 6. Check for exact SKU pattern (e.g. VER-MEN-BLZ-BLK-40)
  const isExactSkuMatch = isExactSkuPattern(cleaned);

  // 7. Lowercase normalized version for catalog keyword matching
  const normalized = cleaned.toLowerCase();

  // 8. Tokenize into individual words
  const rawTokens = normalized
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // 9. Synonym expansion
  const expandedTerms = expandSynonyms(rawTokens);

  return {
    raw: rawTrimmed,
    normalized,
    tokens: rawTokens,
    expandedTerms,
    isExactSkuMatch,
  };
}

/**
 * Generates a potential "Did you mean" suggestion based on common spelling variants or synonym redirects.
 */
export function getDidYouMeanSuggestion(normalizedQuery: string): string | null {
  if (!normalizedQuery || normalizedQuery.trim().length < 3) return null;

  const words = normalizedQuery.toLowerCase().trim().split(/\s+/);
  let changed = false;

  const correctedWords = words.map((word) => {
    // 1. Check direct synonym mapping
    if (FASHION_SYNONYMS[word]) {
      changed = true;
      return FASHION_SYNONYMS[word];
    }

    // 2. Check if already exact match in vocabulary
    if (FASHION_VOCABULARY.includes(word)) {
      return word;
    }

    // 3. Typo tolerance: search closest vocabulary word with distance <= 2
    let closestWord: string | null = null;
    let minDistance = 3; // Max threshold: 2 edits

    for (const vocab of FASHION_VOCABULARY) {
      // Don't compare very different lengths
      if (Math.abs(vocab.length - word.length) > 2) continue;

      const dist = levenshteinDistance(word, vocab);
      if (dist < minDistance) {
        minDistance = dist;
        closestWord = vocab;
      }
    }

    if (closestWord && minDistance <= 2) {
      changed = true;
      return closestWord;
    }

    return word;
  });

  if (changed) {
    return correctedWords.join(" ");
  }

  return null;
}
