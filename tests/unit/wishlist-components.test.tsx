import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { ProductCard } from "@/components/product/product-card";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { WishlistProvider } from "@/context/wishlist-context";
import { ProductPreview } from "@/types/storefront";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/shop",
  useSearchParams: () => new URLSearchParams(),
}));

const mockProduct: ProductPreview = {
  id: "prod-101",
  slug: "chanderi-silk-kurta",
  brand: "VÉRONA ATELIER",
  title: "Chanderi Silk Kurta",
  currentPrice: 8500,
  mrp: 9500,
  discountPercent: 11,
  rating: 4.8,
  ratingCount: 15,
  primaryImage: "/images/kurta.jpg",
  category: "Kurtas",
  gender: "men",
  sizes: ["38", "40", "42"],
  colors: [{ name: "Ivory", hex: "#FFFFF0" }],
  inStock: true,
};

describe("Phase 13 — Wishlist & Recently Viewed UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const isGet = !init || !init.method || init.method.toUpperCase() === "GET";
      if (url.includes("/api/wishlist") && isGet) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                items: [
                  {
                    id: "item-1",
                    productId: mockProduct.id,
                    product: mockProduct,
                  },
                ],
                count: 1,
              },
            }),
        });
      }
      if (url.includes("/api/recently-viewed") && isGet) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                items: [mockProduct],
                count: 1,
              },
            }),
        });
      }
      if (url.includes("/api/wishlist") && init?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { removed: true } }),
        });
      }
      if (url.includes("/api/recently-viewed") && init?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { cleared: 1 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  describe("ProductCard Wishlist Integration", () => {
    it("should render wishlist button with accessible aria-label and toggle state", async () => {
      render(
        <WishlistProvider>
          <ProductCard product={mockProduct} />
        </WishlistProvider>
      );

      // Initially loads with item in wishlist (from mock response)
      await waitFor(() => {
        const heartBtn = screen.getByRole("button", {
          name: /Remove from wishlist: Chanderi Silk Kurta/i,
        });
        expect(heartBtn).toBeInTheDocument();
        expect(heartBtn).toHaveAttribute("aria-pressed", "true");
      });

      // Click to toggle off
      const heartBtn = screen.getByRole("button", {
        name: /Remove from wishlist: Chanderi Silk Kurta/i,
      });
      fireEvent.click(heartBtn);

      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: /Add to wishlist: Chanderi Silk Kurta/i,
          })
        ).toBeInTheDocument();
      });
    });
  });

  describe("RecentlyViewed Component", () => {
    it("should render recently viewed items and trigger clear history", async () => {
      render(
        <WishlistProvider>
          <RecentlyViewed excludeProductId="prod-other" />
        </WishlistProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Recently Viewed")).toBeInTheDocument();
        expect(screen.getByText("Chanderi Silk Kurta")).toBeInTheDocument();
      });

      const clearBtn = screen.getByRole("button", { name: /Clear recently viewed history/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        // Section unmounts / clears
        expect(screen.queryByText("Chanderi Silk Kurta")).not.toBeInTheDocument();
      });
    });

    it("should render nothing if fetch returns empty list", async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: { items: [], count: 0 },
            }),
        } as any)
      );

      const { container } = render(
        <WishlistProvider>
          <RecentlyViewed />
        </WishlistProvider>
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe("WishlistView Component", () => {
    it("should render items count and allow clearing entire wardrobe", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(
        <WishlistProvider>
          <WishlistView />
        </WishlistProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/1\s+Item/i)).toBeInTheDocument();
        expect(screen.getAllByText("Chanderi Silk Kurta").length).toBeGreaterThanOrEqual(1);
      });

      const clearBtn = screen.getByRole("button", { name: /Clear all saved wishlist items/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText("Your Wishlist Is Empty")).toBeInTheDocument();
      });
    });
  });
});
