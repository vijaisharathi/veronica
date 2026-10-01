import { test, expect } from "@playwright/test";

test.describe("VÉRONA Global Storefront & Navigation (E2E)", () => {
  test("desktop header should display primary navigation and navigate correctly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Announcement bar is visible and dismissible
    const announcement = page.locator("aside", { hasText: /THE ATELIER PREVIEW/i });
    await expect(announcement).toBeVisible();
    const dismissBtn = page.getByRole("button", { name: /Dismiss announcement bar/i });
    await dismissBtn.click();
    await expect(announcement).not.toBeVisible();

    // Verify Brand Logo in Header
    const logo = page.locator("header").getByRole("link", { name: "VÉRONA Home" });
    await expect(logo).toBeVisible();

    // Navigate to Men's Atelier
    const menLink = page.locator("nav[aria-label='Main Navigation']").getByRole("link", { name: "Men", exact: true });
    await menLink.click();
    await expect(page).toHaveURL(/\/men/);
    await expect(page.getByRole("heading", { name: /The Men's Atelier/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();

    // Navigate to Women's Couture
    const womenLink = page.locator("nav[aria-label='Main Navigation']").getByRole("link", { name: "Women", exact: true });
    await womenLink.click();
    await expect(page).toHaveURL(/\/women/);
    await expect(page.getByRole("heading", { name: /Women's Couture/i })).toBeVisible();

    // Navigate to Kids
    const kidsLink = page.locator("nav[aria-label='Main Navigation']").getByRole("link", { name: "Kids", exact: true });
    await kidsLink.click();
    await expect(page).toHaveURL(/\/kids/);
    await expect(page.getByRole("heading", { name: /Junior Elegance/i })).toBeVisible();

    // Navigate to New Arrivals
    const arrivalsLink = page.locator("nav[aria-label='Main Navigation']").getByRole("link", { name: "New Arrivals", exact: true });
    await arrivalsLink.click();
    await expect(page).toHaveURL(/\/new-arrivals/);
    await expect(page.getByRole("heading", { name: /New Season Arrivals/i })).toBeVisible();

    // Navigate to Sale
    const saleLink = page.locator("nav[aria-label='Main Navigation']").getByRole("link", { name: "Sale", exact: true });
    await saleLink.click();
    await expect(page).toHaveURL(/\/sale/);
    await expect(page.getByRole("heading", { name: /Private Archive Sale/i })).toBeVisible();
  });

  test("global search overlay should open, show trending, and submit safe queries", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Click search trigger
    const searchBtn = page.getByRole("button", { name: /Open search dialog/i });
    await searchBtn.click();

    // Verify search modal opened
    const searchInput = page.getByRole("searchbox", { name: /Search garments and collections/i });
    await expect(searchInput).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Trending Right Now")).toBeVisible();

    // Type query and press Enter
    await searchInput.fill("Linen");
    await searchInput.press("Enter");

    // Navigates to safe search URL
    await expect(page).toHaveURL(/\/search\?q=Linen/);
    await expect(page.getByRole("heading", { name: /Results for “Linen”/i })).toBeVisible();
  });

  test("wishlist and cart navigation affordances should lead to dedicated presentation shells", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Click Wishlist
    const wishlistLink = page.locator("header").getByRole("link", { name: /Saved Items/i });
    await wishlistLink.click();
    await expect(page).toHaveURL(/\/wishlist/);
    await expect(page.getByRole("heading", { name: /Your Wishlist Is Empty/i })).toBeVisible();

    // Click Cart
    const cartLink = page.locator("header").getByRole("link", { name: "Shopping Bag" });
    await cartLink.click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByRole("heading", { name: /Your Shopping Bag Is Empty/i })).toBeVisible();
  });

  test("mobile navigation drawer and bottom nav should work seamlessly on compact screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone standard
    await page.goto("/");

    // Mobile header is visible
    const mobileLogo = page.getByRole("link", { name: "VÉRONA Home" });
    await expect(mobileLogo).toBeVisible();

    // Open mobile drawer
    const drawerTrigger = page.getByRole("button", { name: /Open Navigation Menu/i });
    await drawerTrigger.click();

    // Drawer is visible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("link", { name: "Client Account & Profile" })).toBeVisible();

    // Close on Escape key
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Mobile bottom navigation items are visible
    const bottomNav = page.locator("nav[aria-label='Mobile Bottom Navigation']");
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Shop" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Wishlist" })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "Account" })).toBeVisible();
  });

  // Responsive Layout Overflow Test across multiple viewports
  const VIEWPORTS = [
    { name: "320px (Compact Mobile)", width: 320, height: 640 },
    { name: "375px (Mobile Standard)", width: 375, height: 812 },
    { name: "390px (iPhone 14)", width: 390, height: 844 },
    { name: "430px (iPhone Pro Max)", width: 430, height: 932 },
    { name: "768px (Tablet Portrait)", width: 768, height: 1024 },
    { name: "1024px (Tablet Landscape)", width: 1024, height: 768 },
    { name: "1280px (Laptop)", width: 1280, height: 800 },
    { name: "1440px (Desktop)", width: 1440, height: 900 },
    { name: "1920px (FHD Ultra-wide)", width: 1920, height: 1080 },
  ];

  for (const vp of VIEWPORTS) {
    test(`should render cleanly without horizontal overflow at ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Check for horizontal overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(isOverflowing).toBe(false);
    });
  }
});
