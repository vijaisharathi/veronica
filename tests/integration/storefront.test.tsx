import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import StorefrontHomePage from "@/app/(storefront)/page";
import ShopPage from "@/app/(storefront)/shop/page";
import { ProductDetailView } from "@/components/product/product-detail-view";
import UIStatesShowcasePage from "@/app/(storefront)/states/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Storefront Pages Integration Suite", () => {
  it("should render StorefrontHomePage with all major sections", () => {
    render(<StorefrontHomePage />);

    expect(screen.getByText(/Shop By Category/i)).toBeInTheDocument();
    expect(screen.getByText(/The Current Edit/i)).toBeInTheDocument();
    expect(screen.getByText(/New Season Arrivals/i)).toBeInTheDocument();
    expect(screen.getByText(/The Mid-Season Private Archive/i)).toBeInTheDocument();
    expect(screen.getByText(/Where Craft Meets Contemporary Silhouette/i)).toBeInTheDocument();
  });

  it("should render ShopPage with breadcrumbs, title, and filters", () => {
    render(<ShopPage />);

    expect(screen.getByRole("heading", { name: /All Garments/i })).toBeInTheDocument();
    expect(screen.getByText(/Pure Natural Fibers/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Filter By/i)[0]).toBeInTheDocument();
  });

  it("should render ProductDetailView with gallery, size selector, and pincode checker", () => {
    render(<ProductDetailView />);

    expect(screen.getByRole("button", { name: /Add To Bag/i })).toBeInTheDocument();
    expect(screen.getByText(/Select Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivery Options & Services/i)).toBeInTheDocument();
    expect(screen.getByText(/Artisanal Specifications/i)).toBeInTheDocument();
  });

  it("should render UIStatesShowcasePage with tabs", () => {
    render(<UIStatesShowcasePage />);

    expect(screen.getByText(/Storefront UI State Catalog/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Shopping Bag Is Empty/i)).toBeInTheDocument();
  });
});
