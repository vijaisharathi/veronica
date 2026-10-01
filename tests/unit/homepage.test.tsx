import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  HeroSection,
  CategoryDiscovery,
  CategoryCard,
  SectionHeading,
  ProductRail,
  FeaturedCollection,
  CollectionGrid,
  PromotionBanner,
  EditorialSection,
  EditorialCard,
  StyleDiscovery,
  TrustBenefits,
  NewsletterCTA,
  HomepageEmptyState,
  SectionErrorBoundary,
} from "@/components/storefront/homepage";
import { HOMEPAGE_DATA } from "@/config/homepage";
import { ROUTES } from "@/config/routes";

describe("Phase 07: Homepage & Fashion Discovery Component Suite", () => {
  describe("HeroSection", () => {
    it("renders single primary H1, eyebrow, and dual CTAs", () => {
      render(<HeroSection />);

      // Exactly one H1
      const h1Elements = screen.getAllByRole("heading", { level: 1 });
      expect(h1Elements).toHaveLength(1);
      expect(h1Elements[0]).toHaveTextContent(/Everyday/i);

      // Eyebrow badge
      expect(screen.getByText(/Runway Drop • Spring \/ Summer 2026/i)).toBeInTheDocument();

      // Dual CTAs
      const shopWomenLink = screen.getByRole("link", { name: /Shop Women/i });
      expect(shopWomenLink).toHaveAttribute("href", ROUTES.WOMEN);

      const shopMenLink = screen.getByRole("link", { name: /Shop Men/i });
      expect(shopMenLink).toHaveAttribute("href", ROUTES.MEN);
    });
  });

  describe("SectionHeading", () => {
    it("renders eyebrow, semantic H2, description, and action link", () => {
      render(
        <SectionHeading
          eyebrow="Curated Edit"
          title="Featured Garments"
          description="Hand-selected pieces from our Jaipur atelier"
          action={{ label: "View All", href: ROUTES.NEW_ARRIVALS }}
        />
      );

      expect(screen.getByText(/Curated Edit/i)).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /Featured Garments/i })).toBeInTheDocument();
      expect(screen.getByText(/Hand-selected pieces from our Jaipur atelier/i)).toBeInTheDocument();
      const actionLink = screen.getByRole("link", { name: /View All/i });
      expect(actionLink).toHaveAttribute("href", ROUTES.NEW_ARRIVALS);
    });

    it("renders centered layout variant correctly", () => {
      render(
        <SectionHeading
          centered
          eyebrow="Heritage"
          title="Atelier Craft"
          action={{ label: "Explore", href: ROUTES.STATES }}
        />
      );

      expect(screen.getByRole("heading", { level: 2, name: /Atelier Craft/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Explore/i })).toHaveAttribute("href", ROUTES.STATES);
    });
  });

  describe("CategoryDiscovery & CategoryCard", () => {
    it("renders all category cards with links and item counts", () => {
      render(<CategoryDiscovery />);

      expect(screen.getByRole("heading", { level: 2, name: /Shop By Category/i })).toBeInTheDocument();
      expect(screen.getByText(/Women's Couture/i)).toBeInTheDocument();
      expect(screen.getByText(/Men's Sartorial/i)).toBeInTheDocument();
      expect(screen.getByText(/Heritage Weaves/i)).toBeInTheDocument();
      expect(screen.getByText(/Casual Luxury/i)).toBeInTheDocument();
      expect(screen.getByText(/Junior Elegance/i)).toBeInTheDocument();
    });

    it("renders individual CategoryCard with accessible label", () => {
      const mockCategory = HOMEPAGE_DATA.categories[0]!;
      render(<CategoryCard category={mockCategory} />);

      const link = screen.getByRole("link", { name: `Shop ${mockCategory.name}` });
      expect(link).toHaveAttribute("href", `/shop?category=${mockCategory.slug}`);
      expect(screen.getByText(mockCategory.name)).toBeInTheDocument();
    });
  });

  describe("ProductRail", () => {
    it("renders product cards and navigation controls", () => {
      render(
        <ProductRail
          products={HOMEPAGE_DATA.trendingProducts}
          ariaLabel="Test product rail"
        />
      );

      expect(screen.getByRole("region", { name: /Test product rail/i })).toBeInTheDocument();
      expect(screen.getByText(HOMEPAGE_DATA.trendingProducts[0]!.title)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Scroll products left/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Scroll products right/i })).toBeInTheDocument();
    });

    it("returns null when product list is empty", () => {
      const { container } = render(<ProductRail products={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("FeaturedCollection & CollectionGrid", () => {
    it("renders featured collection with subtitle and CTA", () => {
      render(<FeaturedCollection />);

      expect(screen.getByRole("heading", { level: 2, name: /THE AEGEAN MONOCHROME/i })).toBeInTheDocument();
      expect(screen.getByText(/Explore The Lookbook/i)).toBeInTheDocument();
    });

    it("renders collection grid tiles", () => {
      render(<CollectionGrid />);

      expect(screen.getByText(/Streetwear Atelier/i)).toBeInTheDocument();
      expect(screen.getByText(/The Office Edit/i)).toBeInTheDocument();
      expect(screen.getByText(/Weekend Fits/i)).toBeInTheDocument();
      expect(screen.getByText(/Festive Splendor/i)).toBeInTheDocument();
    });
  });

  describe("PromotionBanner", () => {
    it("renders commercial promotional archive block with CTA to sale", () => {
      render(<PromotionBanner />);

      expect(screen.getByText(/The Mid-Season Private Archive/i)).toBeInTheDocument();
      expect(screen.getByText(/Privileged Access/i)).toBeInTheDocument();
      const saleLink = screen.getByRole("link", { name: /Explore Sale Archive/i });
      expect(saleLink).toHaveAttribute("href", ROUTES.SALE);
    });
  });

  describe("EditorialSection & EditorialCard", () => {
    it("renders magazine stories and craftsmanship atelier manifesto", () => {
      render(<EditorialSection />);

      expect(screen.getByRole("heading", { level: 2, name: /The VÉRONA Edit/i })).toBeInTheDocument();
      expect(screen.getByText(/Layering for the High-Energy City/i)).toBeInTheDocument();
      expect(screen.getByText(/Where Craft Meets Contemporary Silhouette/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Sartorial Architecture/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Pure Raw Fibres/i)).toBeInTheDocument();
      expect(screen.getByText(/Artisanal Integrity/i)).toBeInTheDocument();
    });

    it("renders individual EditorialCard with read time", () => {
      const mockStory = HOMEPAGE_DATA.editorialStories[0]!;
      render(<EditorialCard story={mockStory} />);

      expect(screen.getByText(mockStory.title)).toBeInTheDocument();
      expect(screen.getByText(mockStory.readTime)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Read Story/i })).toHaveAttribute("href", mockStory.href);
    });
  });

  describe("StyleDiscovery", () => {
    it("renders visual aesthetic tiles", () => {
      render(<StyleDiscovery />);

      expect(screen.getByRole("heading", { level: 2, name: /Discover By Style/i })).toBeInTheDocument();
      expect(screen.getByText(/Minimalist/i)).toBeInTheDocument();
      expect(screen.getByText(/Street Couture/i)).toBeInTheDocument();
      expect(screen.getByText(/Smart Casual/i)).toBeInTheDocument();
      expect(screen.getByText(/Festive Splendor/i)).toBeInTheDocument();
      expect(screen.getByText(/Everyday Staples/i)).toBeInTheDocument();
    });
  });

  describe("TrustBenefits", () => {
    it("renders trust assurance pillars", () => {
      render(<TrustBenefits />);

      expect(screen.getByText(/Easy 15-Day Returns/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Secure Payments/i)).toBeInTheDocument();
      expect(screen.getByText(/Express Nationwide Delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/Certified Artisanal Quality/i)).toBeInTheDocument();
      expect(screen.getByText(/Dedicated Client Concierge/i)).toBeInTheDocument();
    });
  });

  describe("NewsletterCTA", () => {
    it("validates invalid email format and presents error", () => {
      render(<NewsletterCTA />);

      const input = screen.getByPlaceholderText(/Enter your email address/i);
      const submitBtn = screen.getByRole("button", { name: /Join/i });

      fireEvent.change(input, { target: { value: "invalid-email" } });
      fireEvent.click(submitBtn);

      expect(screen.getByText(/Please provide a valid email address/i)).toBeInTheDocument();
    });

    it("displays confirmation message upon valid submission", () => {
      render(<NewsletterCTA />);

      const input = screen.getByPlaceholderText(/Enter your email address/i);
      const submitBtn = screen.getByRole("button", { name: /Join/i });

      fireEvent.change(input, { target: { value: "client@verona.fashion" } });
      fireEvent.click(submitBtn);

      expect(
        screen.getByText(/Thank you for subscribing. Your private access code has been dispatched./i)
      ).toBeInTheDocument();
    });
  });

  describe("HomepageEmptyState", () => {
    it("renders custom title, message, and CTA", () => {
      render(
        <HomepageEmptyState
          title="No Outfits Available"
          message="Check back soon for new atelier drops."
          ctaText="Discover Sale"
          ctaHref={ROUTES.SALE}
        />
      );

      expect(screen.getByText(/No Outfits Available/i)).toBeInTheDocument();
      expect(screen.getByText(/Check back soon for new atelier drops/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Discover Sale/i })).toHaveAttribute("href", ROUTES.SALE);
    });
  });

  describe("SectionErrorBoundary", () => {
    it("catches child error and displays friendly retry UI without crashing", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      function BrokenComponent(): React.JSX.Element {
        throw new Error("Simulated atelier section crash");
      }

      render(
        <SectionErrorBoundary sectionName="Test Dynamic Section">
          <BrokenComponent />
        </SectionErrorBoundary>
      );

      expect(screen.getByText(/Unable to load this section/i)).toBeInTheDocument();
      expect(screen.getByText(/We encountered an issue displaying Test Dynamic Section/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
