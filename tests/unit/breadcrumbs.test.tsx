import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

describe("Breadcrumbs Component Suite", () => {
  it("should render semantic breadcrumb navigation element", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Men", href: "/men" },
          { label: "Shirts", href: "/shop?category=shirts" },
          { label: "Italian Linen Shirt" },
        ]}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
  });

  it("should mark the final item with aria-current='page'", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Women", href: "/women" },
          { label: "Evening Dresses" },
        ]}
      />
    );

    const activeItem = screen.getByText("Evening Dresses");
    expect(activeItem).toHaveAttribute("aria-current", "page");
  });

  it("should render links for intermediate breadcrumb items", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Kids", href: "/kids" },
          { label: "Boys Festive" },
        ]}
      />
    );

    const kidsLink = screen.getByRole("link", { name: "Kids" });
    expect(kidsLink).toHaveAttribute("href", "/kids");
  });

  it("should render home icon link when showHomeIcon is true", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Sale" }]}
        showHomeIcon={true}
      />
    );

    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should return null when items array is empty", () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
