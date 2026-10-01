import { describe, it, expect } from "vitest";
import { ROUTES } from "@/config/routes";
import {
  PRIMARY_NAVIGATION,
  ANNOUNCEMENT_CONFIG,
  FOOTER_SECTIONS,
  SEARCH_SUGGESTIONS,
} from "@/config/navigation";

describe("Global Navigation Configuration Suite", () => {
  it("should define all essential storefront route constants", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.MEN).toBe("/men");
    expect(ROUTES.WOMEN).toBe("/women");
    expect(ROUTES.KIDS).toBe("/kids");
    expect(ROUTES.NEW_ARRIVALS).toBe("/new-arrivals");
    expect(ROUTES.SALE).toBe("/sale");
    expect(ROUTES.SEARCH).toBe("/search");
    expect(ROUTES.ACCOUNT).toBe("/account");
    expect(ROUTES.WISHLIST).toBe("/wishlist");
    expect(ROUTES.CART).toBe("/cart");
    expect(ROUTES.SHOP).toBe("/shop");
  });

  it("should configure the primary navigation with valid slugs and mega menus", () => {
    expect(PRIMARY_NAVIGATION.length).toBeGreaterThanOrEqual(5);

    const ids = PRIMARY_NAVIGATION.map((item) => item.id);
    expect(ids).toContain("men");
    expect(ids).toContain("women");
    expect(ids).toContain("kids");
    expect(ids).toContain("new-arrivals");
    expect(ids).toContain("sale");

    for (const item of PRIMARY_NAVIGATION) {
      expect(item.name).toBeTruthy();
      expect(item.href).toMatch(/^\/[a-z0-9\-_]*/);
      expect(item.megaMenu).toBeDefined();
      expect(item.megaMenu.sections.length).toBeGreaterThan(0);

      for (const section of item.megaMenu.sections) {
        expect(section.title).toBeTruthy();
        expect(section.items.length).toBeGreaterThan(0);
        for (const subItem of section.items) {
          expect(subItem.label).toBeTruthy();
          expect(subItem.href).toBeTruthy();
        }
      }
    }
  });

  it("should configure announcement bar items", () => {
    expect(ANNOUNCEMENT_CONFIG.enabled).toBe(true);
    expect(ANNOUNCEMENT_CONFIG.items.length).toBeGreaterThan(0);
    for (const item of ANNOUNCEMENT_CONFIG.items) {
      expect(item.id).toBeTruthy();
      expect(item.text).toBeTruthy();
    }
  });

  it("should configure valid footer sections without empty titles", () => {
    expect(FOOTER_SECTIONS.length).toBeGreaterThanOrEqual(4);
    for (const section of FOOTER_SECTIONS) {
      expect(section.title).toBeTruthy();
      expect(section.links.length).toBeGreaterThan(0);
      for (const link of section.links) {
        expect(link.label).toBeTruthy();
        expect(link.href).toBeTruthy();
      }
    }
  });

  it("should configure trending and recent search suggestions", () => {
    expect(SEARCH_SUGGESTIONS.recent.length).toBeGreaterThan(0);
    expect(SEARCH_SUGGESTIONS.trending.length).toBeGreaterThan(0);
    expect(SEARCH_SUGGESTIONS.popularCategories.length).toBeGreaterThan(0);
  });
});
