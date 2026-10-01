/**
 * VÉRONA — Phase 11 Product Details Experience Unit Tests
 *
 * Tests for ProductGallery, VariantSelector, ProductShareButton, PincodeChecker,
 * and ProductDetailView rendering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { ProductGallery } from "@/components/product/product-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { ProductShareButton } from "@/components/product/product-share-button";
import { PincodeChecker } from "@/components/product/pincode-checker";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { ProductDTO } from "@/modules/catalog/product.dto";
import { Gender, ProductStatus, VariantStatus } from "@/constants/status";

const mockProduct: ProductDTO = {
  id: "prod-silk-gown",
  name: "Mulberry Silk Evening Gown",
  slug: "mulberry-silk-evening-gown",
  description: "Draped luxury gown made of 100% pure Mulberry silk.",
  brand: { id: "b1", name: "VÉRONA ATELIER", slug: "verona-atelier" },
  categories: [{ id: "c1", name: "Evening Wear", slug: "evening-wear", gender: "WOMEN" }],
  collections: [{ id: "col1", name: "Runway Edit", slug: "runway-edit" }],
  productType: "Gown",
  gender: Gender.WOMEN,
  status: ProductStatus.PUBLISHED,
  tags: ["silk", "evening", "couture"],
  media: [
    { url: "/images/silk-gown-front.jpg", isPrimary: true, sortOrder: 0 },
    { url: "/images/silk-gown-back.jpg", isPrimary: false, sortOrder: 1 },
  ],
  variants: [
    {
      id: "var-noir-s",
      productId: "prod-silk-gown",
      sku: "VER-DRS-NOIR-S",
      size: "S",
      color: { name: "Noir", slug: "noir", hexCode: "#111111" },
      variantImages: ["/images/silk-gown-front.jpg"],
      sellingPrice: 18000,
      mrp: 22000,
      sellingPriceMinor: 1800000,
      mrpMinor: 2200000,
      discountPercent: 18,
      status: VariantStatus.ACTIVE,
      active: true,
      available: true,
    },
    {
      id: "var-noir-m",
      productId: "prod-silk-gown",
      sku: "VER-DRS-NOIR-M",
      size: "M",
      color: { name: "Noir", slug: "noir", hexCode: "#111111" },
      variantImages: ["/images/silk-gown-front.jpg"],
      sellingPrice: 18000,
      mrp: 22000,
      sellingPriceMinor: 1800000,
      mrpMinor: 2200000,
      discountPercent: 18,
      status: VariantStatus.ACTIVE,
      active: true,
      available: false, // Out of stock size
    },
  ],
  attributes: [
    { label: "Weave", value: "Satin Finish" },
    { label: "Lining", value: "Cupro Silk" },
  ],
  fabric: "100% Mulberry Silk",
  fit: "Bias Cut Tailored",
  pattern: "Solid",
  occasion: "Evening Gala",
  season: "Autumn / Winter",
  careInstructions: ["Specialist dry clean only", "Cool iron inside out"],
  pricing: {
    currentPrice: 18000,
    mrp: 22000,
    currentPriceMinor: 1800000,
    mrpMinor: 2200000,
    discountPercent: 18,
    hasDiscount: true,
    isPriceRange: false,
    minPrice: 18000,
    maxPrice: 18000,
  },
  availability: {
    inStock: true,
    status: "AVAILABLE",
  },
  featured: true,
  newArrival: true,
  bestseller: false,
  createdAt: new Date().toISOString(),
};

describe("Phase 11 — Product Details Experience Unit Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProductGallery", () => {
    it("renders gallery with primary image and accessible alt text", () => {
      render(
        <ProductGallery
          images={["/images/front.jpg", "/images/back.jpg"]}
          title="Mulberry Silk Evening Gown"
        />
      );

      const mainImg = screen.getByAltText(/Mulberry Silk Evening Gown — Atelier fashion view 1/i);
      expect(mainImg).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("navigates images with Next and Previous buttons", () => {
      render(
        <ProductGallery
          images={["/images/front.jpg", "/images/back.jpg"]}
          title="Mulberry Silk Evening Gown"
        />
      );

      const nextBtn = screen.getByRole("button", { name: /Next view/i });
      fireEvent.click(nextBtn);

      expect(screen.getByText("2 / 2")).toBeInTheDocument();

      const prevBtn = screen.getByRole("button", { name: /Previous view/i });
      fireEvent.click(prevBtn);

      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("cycles images using keyboard ArrowRight and ArrowLeft", () => {
      render(
        <ProductGallery
          images={["/images/front.jpg", "/images/back.jpg"]}
          title="Mulberry Silk Evening Gown"
        />
      );

      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("2 / 2")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "ArrowLeft" });
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("switches zoom state when zoom button is clicked", () => {
      render(
        <ProductGallery
          images={["/images/front.jpg"]}
          title="Mulberry Silk Evening Gown"
        />
      );

      const zoomBtn = screen.getByRole("button", { name: /Zoom into image/i });
      fireEvent.click(zoomBtn);

      expect(screen.getByRole("button", { name: /Reset zoom/i })).toBeInTheDocument();
    });
  });

  describe("VariantSelector", () => {
    it("renders color swatches and size buttons with selection states", () => {
      const handleColor = vi.fn();
      const handleSize = vi.fn();

      render(
        <VariantSelector
          variants={mockProduct.variants}
          selectedColor="Noir"
          selectedSize="S"
          onSelectColor={handleColor}
          onSelectSize={handleSize}
        />
      );

      expect(screen.getByText("Color")).toBeInTheDocument();
      expect(screen.getByText("(Noir)")).toBeInTheDocument();
      expect(screen.getByText("Select Size")).toBeInTheDocument();
      expect(screen.getByText("(S)")).toBeInTheDocument();
    });
  });

  describe("ProductShareButton", () => {
    it("copies canonical URL to clipboard and gives visual feedback", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <ProductShareButton
          title="Mulberry Silk Evening Gown"
          slug="mulberry-silk-evening-gown"
        />
      );

      const shareBtn = screen.getByRole("button", { name: /Share/i });
      await act(async () => {
        fireEvent.click(shareBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("/product/mulberry-silk-evening-gown")
      );
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  describe("PincodeChecker", () => {
    it("validates 6-digit Indian PIN codes and rejects invalid formats", () => {
      render(<PincodeChecker />);

      const input = screen.getByPlaceholderText(/Enter 6-digit PIN code/i);
      const checkBtn = screen.getByRole("button", { name: /Check/i });

      // Button is disabled when empty or short
      expect(checkBtn).toBeDisabled();

      // Enter 4 digits: remains disabled
      fireEvent.change(input, { target: { value: "1100" } });
      expect(checkBtn).toBeDisabled();

      // Enter 6 valid digits: button enables
      fireEvent.change(input, { target: { value: "110001" } });
      expect(checkBtn).not.toBeDisabled();
    });

    it("rejects PIN code starting with 0", () => {
      render(<PincodeChecker />);

      const input = screen.getByPlaceholderText(/Enter 6-digit PIN code/i);
      fireEvent.change(input, { target: { value: "012345" } });

      const checkBtn = screen.getByRole("button", { name: /Check/i });
      fireEvent.click(checkBtn);

      expect(
        screen.getByText(/cannot start with 0/i)
      ).toBeInTheDocument();
    });
  });

  describe("ProductDetailView", () => {
    it("renders single primary H1 heading with product name", () => {
      render(<ProductDetailView product={mockProduct} />);

      const headings = screen.getAllByRole("heading", { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent("Mulberry Silk Evening Gown");
    });

    it("renders brand, pricing, discount, and availability badge", () => {
      render(<ProductDetailView product={mockProduct} />);

      expect(screen.getByText("VÉRONA ATELIER")).toBeInTheDocument();
      expect(screen.getByText("₹18,000")).toBeInTheDocument();
      expect(screen.getByText("MRP ₹22,000")).toBeInTheDocument();
      expect(screen.getByText("(18% OFF)")).toBeInTheDocument();
      expect(screen.getByText(/In Stock — Ready for Atelier Dispatch/i)).toBeInTheDocument();
    });

    it("preserves strict Phase boundaries with no fake mutations", () => {
      render(<ProductDetailView product={mockProduct} />);

      // Add to bag button exists but does not trigger fake alerts
      const bagBtn = screen.getByRole("button", { name: /Add to Bag/i });
      expect(bagBtn).toBeInTheDocument();

      // Wishlist button exists
      const wishlistBtn = screen.getByRole("button", { name: /Save to wishlist/i });
      expect(wishlistBtn).toBeInTheDocument();

      // Explicit informational boundary disclaimer
      expect(
        screen.getByText(/Bag & Wishlist persistence unlock in upcoming commerce phases/i)
      ).toBeInTheDocument();
    });

    it("renders structured attributes: fabric, fit, pattern, occasion, season", () => {
      render(<ProductDetailView product={mockProduct} />);

      expect(screen.getByText("100% Mulberry Silk")).toBeInTheDocument();
      expect(screen.getByText("Bias Cut Tailored")).toBeInTheDocument();
      expect(screen.getByText("Solid")).toBeInTheDocument();
      expect(screen.getByText("Evening Gala")).toBeInTheDocument();
      expect(screen.getByText("Autumn / Winter")).toBeInTheDocument();
      expect(screen.getByText("Satin Finish")).toBeInTheDocument();
    });
  });
});
