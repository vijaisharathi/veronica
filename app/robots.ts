import { MetadataRoute } from "next";

/**
 * VÉRONA — Robots Configuration (Phase 30)
 *
 * Directs search engine crawlers:
 * - Allows indexing of public catalog, collection, and brand showcase pages.
 * - Strictly disallows administrative, account, cart, checkout, payment, and internal API routes.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verona.fashion";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/men",
          "/women",
          "/kids",
          "/shop",
          "/new-arrivals",
          "/sale",
          "/collection/*",
          "/product/*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/account",
          "/account/*",
          "/cart",
          "/checkout",
          "/checkout/*",
          "/api",
          "/api/*",
          "/search",
          "/states",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
