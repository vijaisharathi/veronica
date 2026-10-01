import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";

describe("UI Primitives Suite", () => {
  it("should render Button with text and respond to click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Explore Atelier</Button>);

    const button = screen.getByRole("button", { name: /Explore Atelier/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should disable Button and show loading spinner when isLoading is true", () => {
    render(<Button isLoading>Submit Order</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("should render Badge with sale variant", () => {
    render(<Badge variant="sale">40% OFF</Badge>);
    const badge = screen.getByText("40% OFF");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-rose-900");
  });

  it("should render Chip and trigger onRemove callback", () => {
    const handleRemove = vi.fn();
    render(<Chip label="Size: 42" onRemove={handleRemove} />);

    const removeBtn = screen.getByRole("button", { name: /Remove filter/i });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it("should render Input with placeholder and receive text", () => {
    render(<Input placeholder="Enter pincode" />);
    const input = screen.getByPlaceholderText("Enter pincode");
    fireEvent.change(input, { target: { value: "302001" } });
    expect((input as HTMLInputElement).value).toBe("302001");
  });

  it("should render SearchInput with clear action", () => {
    const handleClear = vi.fn();
    render(<SearchInput value="Linen" onClear={handleClear} onChange={() => {}} />);

    const clearBtn = screen.getByRole("button", { name: /Clear search query/i });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("should toggle Checkbox state", () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Italian Linen" onChange={handleChange} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalled();
  });

  it("should toggle Switch state", () => {
    const handleToggle = vi.fn();
    render(<Switch checked={false} onChange={handleToggle} label="Dark Mode" />);

    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  it("should render EmptyState with title and action button", () => {
    render(
      <EmptyState
        title="Empty Bag"
        description="No garments added"
        actionLabel="Shop Now"
        actionHref="/shop"
      />
    );

    expect(screen.getByText("Empty Bag")).toBeInTheDocument();
    expect(screen.getByText("No garments added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shop Now/i })).toBeInTheDocument();
  });
});
