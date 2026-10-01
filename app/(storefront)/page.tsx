import * as React from "react";
import type { Metadata } from "next";
import {
  HeroSection,
  CategoryDiscovery,
  TrendingProducts,
  NewArrivals,
  FeaturedCollection,
  CollectionGrid,
  PopularPicks,
  PromotionBanner,
  EditorialSection,
  StyleDiscovery,
  TrustBenefits,
  NewsletterCTA,
  SectionErrorBoundary,
} from "@/components/storefront/homepage";

export const metadata: Metadata = {
  title: "VÉRONA | Luxury Haute Couture & Contemporary Fashion",
  description:
    "Curated digital boutique featuring handcrafted Italian linens, mulberry silk eveningwear, and heritage Indian weaves. Experience contemporary luxury fashion.",
  alternates: {
    canonical: "https://verona.fashion",
  },
  openGraph: {
    title: "VÉRONA | Luxury Haute Couture & Contemporary Fashion",
    description:
      "Curated digital boutique featuring handcrafted Italian linens, mulberry silk eveningwear, and heritage Indian weaves.",
    url: "https://verona.fashion",
    siteName: "VÉRONA",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85",
        width: 1200,
        height: 630,
        alt: "VÉRONA Haute Couture Runway Campaign",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VÉRONA | Luxury Haute Couture & Contemporary Fashion",
    description:
      "Curated digital boutique featuring handcrafted Italian linens, mulberry silk eveningwear, and heritage Indian weaves.",
    images: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85",
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://verona.fashion/#organization",
      "name": "VÉRONA",
      "url": "https://verona.fashion",
      "logo": {
        "@type": "ImageObject",
        "url": "https://verona.fashion/logo.png",
      },
      "description":
        "Luxury haute couture, tailored menswear, and heritage Indian weaves.",
    },
    {
      "@type": "WebSite",
      "@id": "https://verona.fashion/#website",
      "url": "https://verona.fashion",
      "name": "VÉRONA",
      "publisher": {
        "@id": "https://verona.fashion/#organization",
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://verona.fashion/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function StorefrontHomePage() {
  return (
    <>
      {/* Safe Organization & WebSite JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col w-full">
        {/* 1. Hero / Main Fashion Campaign */}
        <HeroSection />

        {/* 2. Shop By Category */}
        <SectionErrorBoundary sectionName="Category Discovery">
          <CategoryDiscovery />
        </SectionErrorBoundary>

        {/* 3. Trending Now */}
        <SectionErrorBoundary sectionName="Trending Products">
          <TrendingProducts />
        </SectionErrorBoundary>

        {/* 4. New Arrivals */}
        <SectionErrorBoundary sectionName="New Arrivals">
          <NewArrivals />
        </SectionErrorBoundary>

        {/* 5. Featured Collection & Curated Tiles */}
        <SectionErrorBoundary sectionName="Featured Collection">
          <FeaturedCollection />
          <CollectionGrid />
        </SectionErrorBoundary>

        {/* 6. Best Sellers / Popular Picks */}
        <SectionErrorBoundary sectionName="Popular Picks">
          <PopularPicks />
        </SectionErrorBoundary>

        {/* 7. Promotional Banner */}
        <SectionErrorBoundary sectionName="Promotional Banner">
          <PromotionBanner />
        </SectionErrorBoundary>

        {/* 8. Fashion Editorial & Craftsmanship Story */}
        <SectionErrorBoundary sectionName="Fashion Editorial">
          <EditorialSection />
        </SectionErrorBoundary>

        {/* 9. Style / Aesthetics Discovery */}
        <SectionErrorBoundary sectionName="Style Discovery">
          <StyleDiscovery />
        </SectionErrorBoundary>

        {/* 10. Trust & Shopping Benefits */}
        <TrustBenefits />

        {/* 11. Newsletter CTA */}
        <NewsletterCTA />
      </div>
    </>
  );
}
