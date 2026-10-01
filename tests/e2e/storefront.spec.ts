import { test, expect } from "@playwright/test";

test.describe("VÉRONA Storefront Foundation (E2E)", () => {
  test("should render the homepage with complete luxury editorial layout", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/VÉRONA/);

    // Verify Brand Logo
    const logo = page.locator("header").getByText("VÉRONA");
    await expect(logo).toBeVisible();

    // Verify Announcement Bar
    await expect(page.getByText(/THE ATELIER PREVIEW/i)).toBeVisible();

    // Verify Hero Section
    await expect(page.getByRole("heading", { name: /Everyday/i })).toBeVisible();

    // Verify Shop By Category
    await expect(page.getByRole("heading", { name: /Shop By Category/i })).toBeVisible();

    // Verify Footer
    await expect(page.locator("footer")).toContainText("VÉRONA Private Limited");
  });

  test("should navigate to /shop and display PLP with filters and products", async ({ page }) => {
    await page.goto("/shop");

    // Title and Breadcrumbs
    await expect(page.getByRole("heading", { name: /All Garments/i })).toBeVisible();
    await expect(page.getByText(/Displaying/i)).toBeVisible();

    // Product cards in grid
    const productCards = page.locator("article");
    await expect(productCards.first()).toBeVisible();
  });

  test("should navigate to /product/[slug] and display PDP gallery and selectors", async ({ page }) => {
    await page.goto("/product/verona-signature-linen-blazer");

    // Title and price
    await expect(page.getByRole("heading", { name: /Italian Linen Blazer/i })).toBeVisible();
    await expect(page.locator("main").getByText("₹8,999").first()).toBeVisible();

    // Size Selector and Add to Bag button
    await expect(page.getByRole("button", { name: /Add To Bag/i })).toBeVisible();
    await expect(page.getByText(/Select Size/i)).toBeVisible();
    await expect(page.getByText(/Delivery Options & Services/i)).toBeVisible();
  });

  test("should navigate to /states and display UI state catalog", async ({ page }) => {
    await page.goto("/states");

    await expect(page.getByText(/Storefront UI State Catalog/i)).toBeVisible();
    await expect(page.getByText(/Your Shopping Bag Is Empty/i)).toBeVisible();
  });
});
