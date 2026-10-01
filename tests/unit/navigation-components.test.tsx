import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnouncementBar } from "@/components/navigation/announcement-bar";
import { StorefrontFooter } from "@/components/layout/storefront-footer";

describe("Navigation & Layout Presentation Components Suite", () => {
  describe("AnnouncementBar", () => {
    it("should render announcement bar text", () => {
      render(<AnnouncementBar />);

      expect(screen.getByRole("complementary", { name: "Announcement" })).toBeInTheDocument();
      expect(screen.getByText(/THE ATELIER PREVIEW/i)).toBeInTheDocument();
    });

    it("should dismiss announcement bar when close button is clicked", () => {
      render(<AnnouncementBar />);

      const closeBtn = screen.getByRole("button", { name: "Dismiss announcement bar" });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole("complementary", { name: "Announcement" })).not.toBeInTheDocument();
    });
  });

  describe("StorefrontFooter", () => {
    it("should render commerce assurance badges", () => {
      render(<StorefrontFooter />);

      expect(screen.getByText("100% Genuine Couture")).toBeInTheDocument();
      expect(screen.getByText("Hassle-Free Returns")).toBeInTheDocument();
      expect(screen.getByText("Express Logistics")).toBeInTheDocument();
      expect(screen.getByText("Sartorial Excellence")).toBeInTheDocument();
    });

    it("should render online shopping department links", () => {
      render(<StorefrontFooter />);

      expect(screen.getByRole("link", { name: /Men's Atelier/i })).toHaveAttribute("href", "/men");
      expect(screen.getByRole("link", { name: /Women's Couture/i })).toHaveAttribute("href", "/women");
      expect(screen.getByRole("link", { name: /Junior Elegance/i })).toHaveAttribute("href", "/kids");
    });

    it("should validate newsletter input and show error on invalid email", () => {
      render(<StorefrontFooter />);

      const input = screen.getByLabelText("Email address for newsletter");
      const submitBtn = screen.getByRole("button", { name: "Subscribe to newsletter" });

      fireEvent.change(input, { target: { value: "invalid-email" } });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Please provide a valid email address")).toBeInTheDocument();
    });

    it("should display confirmation upon submitting a valid email", () => {
      render(<StorefrontFooter />);

      const input = screen.getByLabelText("Email address for newsletter");
      const submitBtn = screen.getByRole("button", { name: "Subscribe to newsletter" });

      fireEvent.change(input, { target: { value: "client@verona.com" } });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Subscription Confirmed")).toBeInTheDocument();
    });
  });
});
