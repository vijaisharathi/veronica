import { MetadataRoute } from "next";
import { connectToDatabase } from "@/db/client";
import { ProductModel, FashionCollectionModel, CategoryModel } from "@/db/models";

/**
 * VÉRONA — Dynamic XML Sitemap Generator (Phase 30)
 *
 * Programmatically generates sitemap.xml for search engine crawlers:
 * - Includes canonical storefront roots, categories, collections, and published products.
 * - Enforces exclusion of private customer accounts, administrative panels, and checkout routes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verona.fashion";
  const now = new Date();

  // Foundational public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/men`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/women`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/kids`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/new-arrivals`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/sale`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  try {
    await connectToDatabase();

    // Published products
    const products = await ProductModel.find(
      { status: "PUBLISHED" },
      { slug: 1, updatedAt: 1 }
    ).lean();

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/product/${p.slug}`,
      lastModified: p.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    // Active seasonal collections
    const collections = await FashionCollectionModel.find(
      { status: "ACTIVE" },
      { slug: 1, updatedAt: 1 }
    ).lean();

    const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
      url: `${baseUrl}/collection/${c.slug}`,
      lastModified: c.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    // Active categories
    const categories = await CategoryModel.find(
      { status: "ACTIVE" },
      { slug: 1, updatedAt: 1 }
    ).lean();

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
      url: `${baseUrl}/category/${cat.slug}`,
      lastModified: cat.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes];
  } catch {
    // If DB is offline during build-time static generation, return valid baseline
    return staticRoutes;
  }
}
