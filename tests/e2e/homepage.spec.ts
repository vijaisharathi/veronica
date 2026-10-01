import { test, expect } from "@playwright/test";

test.describe("VÉRONA Phase 07: Homepage & Fashion Discovery (E2E)", () => {
  test("homepage should load all 11 discovery sections with single H1 and rich presentation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // 1. Exactly one primary H1 in Hero section
    const h1s = page.locator("h1");
    await expect(h1s).toHaveCount(1);
    await expect(h1s).toContainText("Everyday.");

    // Hero CTAs (exact match to distinguish from "Shop Women's Couture")
    const shopWomenCta = page.getByRole("link", { name: "Shop Women", exact: true });
    await expect(shopWomenCta).toBeVisible();
    await expect(shopWomenCta).toHaveAttribute("href", "/women");

    const shopMenCta = page.getByRole("link", { name: "Shop Men", exact: true });
    await expect(shopMenCta).toBeVisible();
    await expect(shopMenCta).toHaveAttribute("href", "/men");

    // 2. Shop By Category
    await expect(page.getByRole("heading", { name: /Shop By Category/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop Women's Couture" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop Men's Sartorial" })).toBeVisible();

    // 3. Trending Now (The Current Edit)
    await expect(page.getByRole("heading", { name: /The Current Edit/i })).toBeVisible();
    await expect(page.getByText(/Asymmetric Draped Mulberry Silk Dress/i)).toBeVisible();

    // 4. New Season Arrivals
    await expect(page.getByRole("heading", { name: /New Season Arrivals/i })).toBeVisible();
    await expect(page.getByText(/Handwoven Chanderi Tissue Silk Saree/i)).toBeVisible();

    // 5. Featured Collection & Curated Tiles
    await expect(page.getByRole("heading", { name: /THE AEGEAN MONOCHROME/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore Streetwear Atelier/i })).toBeVisible();

    // 6. Popular Picks
    await expect(page.getByRole("heading", { name: /Popular Picks/i })).toBeVisible();

    // 7. Promotional Archive Banner
    await expect(page.getByRole("heading", { name: /The Mid-Season Private Archive/i })).toBeVisible();
    const saleArchiveBtn = page.getByRole("link", { name: /Explore Sale Archive/i });
    await expect(saleArchiveBtn).toBeVisible();
    await expect(saleArchiveBtn).toHaveAttribute("href", "/sale");

    // 8. Fashion Editorial & Atelier Story
    await expect(page.getByRole("heading", { name: /The VÉRONA Edit/i })).toBeVisible();
    await expect(page.getByText(/Layering for the High-Energy City/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Where Craft Meets Contemporary Silhouette/i })).toBeVisible();

    // 9. Style Aesthetics Discovery
    await expect(page.getByRole("heading", { name: /Discover By Style/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore Minimalist style/i })).toBeVisible();

    // 10. Trust & Shopping Benefits
    await expect(page.getByRole("heading", { name: /Commerce Built on Trust & Distinction/i })).toBeVisible();
    await expect(page.getByText(/Easy 15-Day Returns/i)).toBeVisible();
    await expect(page.getByText(/100% Secure Payments/i)).toBeVisible();

    // 11. Newsletter CTA
    await expect(page.getByRole("heading", { name: /Get The VÉRONA Edit/i })).toBeVisible();
    const newsletterInput = page.locator("#homepage-newsletter-email");
    await expect(newsletterInput).toBeVisible();

    // Global Footer
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("newsletter subscription interaction should validate email and display confirmation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const newsletterInput = page.locator("#homepage-newsletter-email");
    const newsletterSection = page.locator("section[aria-label='Newsletter Subscription']");
    const joinBtn = newsletterSection.getByRole("button", { name: "Join" });

    // Submit invalid email
    await newsletterInput.fill("invalid-email-format");
    await joinBtn.click();
    await expect(page.getByText(/Please provide a valid email address/i)).toBeVisible();

    // Submit valid email
    await newsletterInput.fill("connoisseur@verona.fashion");
    await joinBtn.click();
    await expect(
      page.getByText(/Thank you for subscribing. Your private access code has been dispatched./i)
    ).toBeVisible();
  });

  test("mega menu interaction from homepage should open on hover/focus and navigate", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Hover on Men's navigation item to open mega menu
    const menNavItem = page.locator("header nav[aria-label='Main Navigation']").getByRole("link", { name: "Men", exact: true });
    await menNavItem.hover();

    // Mega menu dropdown appears with departments
    const megaMenu = page.locator("header div[role='region']");
    await expect(megaMenu).toBeVisible();
    await expect(megaMenu.getByText("Topwear")).toBeVisible();
    await expect(megaMenu.getByText("Bottomwear")).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press("Escape");
    await expect(megaMenu).not.toBeVisible();
  });

  test("global search from homepage should open overlay and navigate safely", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Click search trigger in header
    const searchTrigger = page.getByRole("button", { name: /Open search dialog/i });
    await searchTrigger.click();

    // Verify search modal opened with searchbox
    const searchInput = page.getByRole("searchbox", { name: /Search garments and collections/i });
    await expect(searchInput).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Trending Right Now")).toBeVisible();

    // Type query and press Enter
    await searchInput.fill("Linen");
    await searchInput.press("Enter");

    // Navigates safely to /search?q=Linen
    await expect(page).toHaveURL(/\/search\?q=Linen/);
    await expect(page.getByRole("heading", { name: /Results for “Linen”/i })).toBeVisible();
  });

  // Responsive QA across all 9 required viewports
  const viewports = [
    { width: 320, height: 568, name: "320px (Mobile SE)" },
    { width: 375, height: 667, name: "375px (Mobile Standard)" },
    { width: 390, height: 844, name: "390px (Mobile Modern)" },
    { width: 430, height: 932, name: "430px (Mobile Pro Max)" },
    { width: 768, height: 1024, name: "768px (Tablet Portrait)" },
    { width: 1024, height: 768, name: "1024px (Tablet Landscape)" },
    { width: 1280, height: 800, name: "1280px (Small Desktop)" },
    { width: 1440, height: 900, name: "1440px (Standard Desktop)" },
    { width: 1920, height: 1080, name: "1920px (Large Desktop)" },
  ];

  for (const vp of viewports) {
    test(`homepage should render cleanly without horizontal overflow at ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Hero heading visible
      await expect(page.locator("h1")).toBeVisible();

      // Check no horizontal scrollbar overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBeFalsy();

      // Bottom nav visible on mobile (< 768px), desktop nav visible on desktop (>= 1024px)
      if (vp.width < 768) {
        const bottomNav = page.locator("nav[aria-label='Mobile Bottom Navigation']");
        await expect(bottomNav).toBeVisible();
      } else if (vp.width >= 1024) {
        const desktopNav = page.locator("nav[aria-label='Main Navigation']");
        await expect(desktopNav).toBeVisible();
      }
    });
  }
});
