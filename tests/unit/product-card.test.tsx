import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { ProductCard } from "@/components/product/product-card";
import { ProductPreview } from "@/types/storefront";

const baseProduct: ProductPreview = {
  id: "test-prod-1",
  slug: "test-garment",
  brand: "VÉRONA ATELIER",
  title: "Tailored Italian Linen Jacket",
  currentPrice: 8999,
  mrp: 14999,
  discountPercent: 40,
  rating: 4.8,
  ratingCount: 120,
  primaryImage: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
  category: "blazers",
  gender: "men",
  sizes: ["38", "40", "42"],
  colors: [{ name: "Beige", hex: "#D8C7B5" }],
  inStock: true,
  isNew: true,
  tag: "BESTSELLER",
};

describe("Phase 07: ProductCard Component Suite", () => {
  it("renders product information correctly in normal/discount state", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("VÉRONA ATELIER")).toBeInTheDocument();
    expect(screen.getByText("Tailored Italian Linen Jacket")).toBeInTheDocument();
    expect(screen.getByText("₹8,999")).toBeInTheDocument();
    expect(screen.getByText("₹14,999")).toBeInTheDocument();
    expect(screen.getByText("(40% OFF)")).toBeInTheDocument();
    expect(screen.getByText(/Sizes: 38, 40, 42/i)).toBeInTheDocument();
  });

  it("renders rating and rating count when rating > 0", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("renders badge and bestseller tag", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("BESTSELLER")).toBeInTheDocument();
  });

  it("renders out-of-stock overlay when inStock is false", () => {
    const oosProduct: ProductPreview = {
      ...baseProduct,
      inStock: false,
      tag: "SOLD OUT",
    };

    render(<ProductCard product={oosProduct} />);

    expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
    expect(screen.getByText("SOLD OUT")).toBeInTheDocument();
  });

  it("handles long product name and missing optional rating gracefully", () => {
    const minimalProduct: ProductPreview = {
      id: "test-min",
      slug: "minimal-coat",
      brand: "VÉRONA",
      title: "Extremely Long Luxury Hand-Stitched Artisanal Garment With Complex Draped Architecture and Structured Contours",
      currentPrice: 5000,
      mrp: 5000,
      discountPercent: 0,
      rating: 0,
      ratingCount: 0,
      primaryImage: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
      category: "coats",
      gender: "women",
      sizes: ["S", "M"],
      colors: [],
      inStock: true,
    };

    render(<ProductCard product={minimalProduct} />);

    expect(screen.getByText(minimalProduct.title)).toBeInTheDocument();
    expect(screen.getByText("₹5,000")).toBeInTheDocument();
    // No discount shown when currentPrice == mrp
    expect(screen.queryByText(/% OFF/i)).toBeNull();
    // Rating star badge should not render when rating is 0
    expect(screen.queryByText("0.0")).toBeNull();
  });

  it("supports wishlist button presentation toggle locally without crashing", () => {
    render(<ProductCard product={baseProduct} />);

    const wishlistBtn = screen.getByRole("button", { name: /Add to wishlist/i });
    expect(wishlistBtn).toBeInTheDocument();

    fireEvent.click(wishlistBtn);
    expect(screen.getByRole("button", { name: /Remove from wishlist/i })).toBeInTheDocument();

    fireEvent.click(wishlistBtn);
    expect(screen.getByRole("button", { name: /Add to wishlist/i })).toBeInTheDocument();
  });
});
