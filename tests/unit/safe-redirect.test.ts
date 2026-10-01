import { describe, it, expect } from "vitest";
import { sanitizeReturnUrl } from "@/lib/url";

describe("Phase 13 — Safe Redirect & Return URL Sanitization", () => {
  it("should accept valid internal relative paths", () => {
    expect(sanitizeReturnUrl("/shop")).toBe("/shop");
    expect(sanitizeReturnUrl("/product/classic-linen-shirt")).toBe("/product/classic-linen-shirt");
    expect(sanitizeReturnUrl("/account/wishlist")).toBe("/account/wishlist");
    expect(sanitizeReturnUrl("/shop?category=shirts&sort=price-low")).toBe(
      "/shop?category=shirts&sort=price-low"
    );
  });

  it("should fallback when URL is empty, null, or undefined", () => {
    expect(sanitizeReturnUrl("")).toBe("/");
    expect(sanitizeReturnUrl(null)).toBe("/");
    expect(sanitizeReturnUrl(undefined)).toBe("/");
    expect(sanitizeReturnUrl("   ", "/account")).toBe("/account");
  });

  it("should reject absolute URLs with schemes", () => {
    expect(sanitizeReturnUrl("https://malicious-site.example")).toBe("/");
    expect(sanitizeReturnUrl("http://evil.com/login")).toBe("/");
    expect(sanitizeReturnUrl("ftp://files.example.com")).toBe("/");
  });

  it("should reject protocol-relative URLs", () => {
    expect(sanitizeReturnUrl("//evil.com")).toBe("/");
    expect(sanitizeReturnUrl("//attacker.com/path")).toBe("/");
  });

  it("should reject backslash tricks and Windows file paths", () => {
    expect(sanitizeReturnUrl("/\\evil.com")).toBe("/");
    expect(sanitizeReturnUrl("\\\\evil.com")).toBe("/");
    expect(sanitizeReturnUrl("/path\\evil")).toBe("/");
  });

  it("should reject javascript: and data: pseudo-protocols", () => {
    expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/");
    expect(sanitizeReturnUrl("/javascript:alert(1)")).toBe("/");
    expect(sanitizeReturnUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
  });

  it("should reject CRLF injection attempts", () => {
    expect(sanitizeReturnUrl("/product/1\r\nSet-Cookie: test=1")).toBe("/");
    expect(sanitizeReturnUrl("/account\nLocation: https://evil.com")).toBe("/");
  });
});
