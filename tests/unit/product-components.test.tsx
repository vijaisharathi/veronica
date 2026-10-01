import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { ProductCard } from "@/components/product/product-card";
import { SizeSelector } from "@/components/product/size-selector";
import { ColorSelector } from "@/components/product/color-selector";
import { MOCK_PRODUCTS } from "@/config/mock-storefront";

describe("Product Presentation Components Suite", () => {
  const sampleProduct = MOCK_PRODUCTS[0]!;

  it("should render ProductCard with brand, title, and formatted price", () => {
    render(<ProductCard product={sampleProduct} />);

    expect(screen.getByText(sampleProduct.brand)).toBeInTheDocument();
    expect(screen.getByText(sampleProduct.title)).toBeInTheDocument();
    expect(screen.getByText(`₹${sampleProduct.currentPrice.toLocaleString("en-IN")}`)).toBeInTheDocument();
    expect(screen.getByText(`(${sampleProduct.discountPercent}% OFF)`)).toBeInTheDocument();
  });

  it("should toggle wishlist state on heart click in ProductCard", () => {
    render(<ProductCard product={sampleProduct} />);

    const wishlistBtn = screen.getByRole("button", { name: /Add to wishlist/i });
    fireEvent.click(wishlistBtn);

    expect(screen.getByRole("button", { name: /Remove from wishlist/i })).toBeInTheDocument();
  });

  it("should render SizeSelector and allow selecting available sizes", () => {
    const handleSelectSize = vi.fn();
    render(
      <SizeSelector
        sizes={["38", "40", "42", "44"]}
        selectedSize="40"
        onSelectSize={handleSelectSize}
      />
    );

    const size38Btn = screen.getByRole("button", { name: "38" });
    fireEvent.click(size38Btn);

    expect(handleSelectSize).toHaveBeenCalledWith("38");
  });

  it("should disable unavailable sizes in SizeSelector", () => {
    render(
      <SizeSelector
        sizes={["38", "40", "42"]}
        unavailableSizes={["42"]}
        onSelectSize={() => {}}
      />
    );

    const size42Btn = screen.getByRole("button", { name: "42" });
    expect(size42Btn).toBeDisabled();
  });

  it("should render ColorSelector and allow swatch selection", () => {
    const handleSelectColor = vi.fn();
    const colors = [
      { name: "Noir Black", hex: "#111111" },
      { name: "Oatmeal Beige", hex: "#D8C7B5" },
    ];

    render(
      <ColorSelector
        colors={colors}
        selectedColor="Noir Black"
        onSelectColor={handleSelectColor}
      />
    );

    const beigeBtn = screen.getByRole("button", { name: /Select color Oatmeal Beige/i });
    fireEvent.click(beigeBtn);

    expect(handleSelectColor).toHaveBeenCalledWith("Oatmeal Beige");
  });
});
