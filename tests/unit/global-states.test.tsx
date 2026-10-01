import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OfflineState } from "@/components/storefront/offline-state";
import { SlowNetworkState } from "@/components/storefront/slow-network-state";

describe("Global Storefront States Suite", () => {
  describe("OfflineState", () => {
    it("should render offline status alert and reconnect button", () => {
      render(<OfflineState />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/You Are Currently Offline/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reconnect/i })).toBeInTheDocument();
    });

    it("should trigger onRetry callback when reconnect button is clicked", () => {
      const handleRetry = vi.fn();
      render(<OfflineState onRetry={handleRetry} />);

      const retryBtn = screen.getByRole("button", { name: /Reconnect/i });
      fireEvent.click(retryBtn);

      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("SlowNetworkState", () => {
    it("should render polite status indicator and custom message", () => {
      render(<SlowNetworkState message="Curating runway looks..." />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Curating runway looks...")).toBeInTheDocument();
    });
  });
});
