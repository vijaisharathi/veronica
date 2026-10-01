/**
 * VÉRONA — Phase 09 Money Utility Unit Tests
 *
 * Tests for integer minor units (paise) and money formatting.
 */

import { describe, it, expect } from "vitest";
import {
  formatMoney,
  minorToMajor,
  majorToMinor,
  calculateDiscountPercent,
} from "@/lib/money";

describe("Money Utilities (Phase 09)", () => {
  describe("minorToMajor", () => {
    it("converts paise (minor units) to rupees (major units)", () => {
      expect(minorToMajor(99900)).toBe(999);
      expect(minorToMajor(499900)).toBe(4999);
      expect(minorToMajor(123400)).toBe(1234);
      expect(minorToMajor(0)).toBe(0);
    });

    it("handles negative or invalid values correctly", () => {
      expect(minorToMajor(-100)).toBe(-1);
      expect(minorToMajor(0)).toBe(0);
    });
  });

  describe("majorToMinor", () => {
    it("converts rupees to paise integer units", () => {
      expect(majorToMinor(999)).toBe(99900);
      expect(majorToMinor(4999)).toBe(499900);
      expect(majorToMinor(12.5)).toBe(1250);
      expect(majorToMinor(0)).toBe(0);
    });

    it("rounds cleanly to avoid floating point imprecision", () => {
      expect(majorToMinor(19.99)).toBe(1999);
      expect(majorToMinor(-50)).toBe(-5000);
    });
  });

  describe("formatMoney", () => {
    it("formats rupee amounts from minor units with INR currency symbol", () => {
      const formatted = formatMoney(99900);
      expect(formatted).toContain("999");
      expect(formatted).toMatch(/₹|Rs/);
    });

    it("formats thousands from minor units with proper locale grouping", () => {
      const formatted = formatMoney(499900);
      expect(formatted).toContain("4,999");
    });

    it("handles zero gracefully", () => {
      const formatted = formatMoney(0);
      expect(formatted).toContain("0");
    });
  });

  describe("calculateDiscountPercent", () => {
    it("calculates percentage discount from mrp and selling price", () => {
      expect(calculateDiscountPercent(100000, 80000)).toBe(20);
      expect(calculateDiscountPercent(500000, 250000)).toBe(50);
      expect(calculateDiscountPercent(1000000, 699900)).toBe(30);
    });

    it("returns 0 if selling price is equal to or greater than mrp", () => {
      expect(calculateDiscountPercent(100000, 100000)).toBe(0);
      expect(calculateDiscountPercent(100000, 120000)).toBe(0);
    });

    it("returns 0 if mrp is zero or negative", () => {
      expect(calculateDiscountPercent(0, 50000)).toBe(0);
      expect(calculateDiscountPercent(-10000, 5000)).toBe(0);
    });
  });
});
