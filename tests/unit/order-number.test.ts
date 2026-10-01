import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "@/modules/orders/utils/order-number";

describe("Phase 19 — Order Numbering Unit Tests", () => {
  it("generates a human-readable order number matching VRN-YYYY-XXXXXX format", () => {
    const currentYear = new Date().getFullYear();
    const orderNumber = generateOrderNumber();

    expect(orderNumber).toMatch(new RegExp(`^VRN-${currentYear}-[0-9A-F]{6}$`));
  });

  it("accepts a custom year parameter", () => {
    const orderNumber = generateOrderNumber(2027);
    expect(orderNumber).toMatch(/^VRN-2027-[0-9A-F]{6}$/);
  });

  it("generates 1,000 distinct order numbers with zero collisions", () => {
    const generated = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const num = generateOrderNumber();
      expect(generated.has(num)).toBe(false);
      generated.add(num);
    }

    expect(generated.size).toBe(count);
  });
});
