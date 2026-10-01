import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { CartView } from "@/components/cart/cart-view";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/context/cart-context";
import { CartDTO, CartItemDTO } from "@/modules/cart/cart.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/cart",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock RecentlyViewed to keep test focused on Cart
vi.mock("@/components/product/recently-viewed", () => ({
  RecentlyViewed: () => <div data-testid="recently-viewed-stub" />,
}));

const mockItem: CartItemDTO = {
  id: "item-101",
  cartId: "cart-1",
  productId: "prod-1",
  variantId: "var-1",
  productName: "Tailored Silk Shirt",
  slug: "tailored-silk-shirt",
  image: "/images/shirt.jpg",
  brand: "VÉRONA ATELIER",
  selectedColor: "Ivory",
  selectedSize: "M",
  sku: "TSS-IVR-M",
  quantity: 2,
  unitPriceMinor: 450000,
  unitPriceMajor: 4500,
  lineTotalMinor: 900000,
  lineTotalMajor: 9000,
  priceChanged: false,
  availability: "AVAILABLE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCart: CartDTO = {
  id: "cart-1",
  status: "ACTIVE",
  items: [mockItem],
  itemCount: 2,
  distinctItemCount: 1,
  totals: {
    subtotalMinor: 900000,
    subtotalMajor: 9000,
    promotionDiscountMinor: 0,
    promotionDiscountMajor: 0,
    couponDiscountMinor: 0,
    couponDiscountMajor: 0,
    discountMinor: 0,
    discountMajor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    grandTotalMinor: 900000,
    grandTotalMajor: 9000,
    currency: "INR",
  },
  hasUnavailableItems: false,
  hasPriceChanges: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Phase 14 — Cart UI Components Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const isGet = !init || !init.method || init.method.toUpperCase() === "GET";
      const isDelete = init?.method?.toUpperCase() === "DELETE";
      const isPatch = init?.method?.toUpperCase() === "PATCH";
      const isPost = init?.method?.toUpperCase() === "POST";

      if (url.includes("/api/cart/items/") && url.includes("/move-to-wishlist") && isPost) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { ...mockCart, items: [], itemCount: 0 } }),
        });
      }

      if (url.includes("/api/cart/items/") && isPatch) {
        const body = JSON.parse(init?.body as string || "{}");
        const updatedItem = {
          ...mockItem,
          quantity: body.quantity,
          lineTotalMinor: mockItem.unitPriceMinor * body.quantity,
          lineTotalMajor: mockItem.unitPriceMajor * body.quantity,
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                ...mockCart,
                items: [updatedItem],
                itemCount: body.quantity,
                totals: {
                  ...mockCart.totals,
                  subtotalMinor: updatedItem.lineTotalMinor,
                  subtotalMajor: updatedItem.lineTotalMajor,
                },
              },
            }),
        });
      }

      if (url.includes("/api/cart/items/") && isDelete) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                ...mockCart,
                items: [],
                itemCount: 0,
                distinctItemCount: 0,
                totals: { ...mockCart.totals, subtotalMinor: 0, subtotalMajor: 0 },
              },
            }),
        });
      }

      if (url.endsWith("/api/cart") && isDelete) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                ...mockCart,
                items: [],
                itemCount: 0,
                distinctItemCount: 0,
                totals: { ...mockCart.totals, subtotalMinor: 0, subtotalMajor: 0 },
              },
            }),
        });
      }

      if (url.includes("/api/cart") && isGet) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: mockCart }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  describe("CartView Component", () => {
    it("should render hydrated cart items, subtotal, and specs", async () => {
      render(
        <CartProvider>
          <CartView />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Your Shopping Bag")).toBeInTheDocument();
        expect(screen.getByText("Tailored Silk Shirt")).toBeInTheDocument();
        expect(screen.getByText("VÉRONA ATELIER")).toBeInTheDocument();
        expect(screen.getByText("Ivory")).toBeInTheDocument();
        expect(screen.getByText("M")).toBeInTheDocument();
        expect(screen.getByText("2 Items")).toBeInTheDocument();
      });
    });

    it("should allow incrementing item quantity", async () => {
      render(
        <CartProvider>
          <CartView />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Increase quantity of Tailored Silk Shirt/i)).toBeInTheDocument();
      });

      const plusBtn = screen.getByLabelText(/Increase quantity of Tailored Silk Shirt/i);
      fireEvent.click(plusBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/cart/items/item-101"),
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ quantity: 3 }),
          })
        );
      });
    });

    it("should allow removing item from shopping bag", async () => {
      render(
        <CartProvider>
          <CartView />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Remove Tailored Silk Shirt from bag/i)).toBeInTheDocument();
      });

      const removeBtn = screen.getByLabelText(/Remove Tailored Silk Shirt from bag/i);
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/cart/items/item-101"),
          expect.objectContaining({ method: "DELETE" })
        );
      });
    });

    it("should allow clearing the entire shopping bag after confirmation", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(
        <CartProvider>
          <CartView />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Clear all garments from bag/i })).toBeInTheDocument();
      });

      const clearBtn = screen.getByRole("button", { name: /Clear all garments from bag/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/cart"),
          expect.objectContaining({ method: "DELETE" })
        );
      });
    });

    it("should render empty shopping bag state when items is empty", async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: { ...mockCart, items: [], itemCount: 0, distinctItemCount: 0 },
            }),
        } as any)
      );

      render(
        <CartProvider>
          <CartView />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Your Shopping Bag Is Empty")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Discover Silhouettes/i })).toBeInTheDocument();
      });
    });
  });

  describe("CartDrawer Component", () => {
    it("should not render when drawer is closed", async () => {
      const { container } = render(
        <CartProvider>
          <CartDrawer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
