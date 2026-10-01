import { test, expect } from "@playwright/test";

test.describe("VÉRONA Customer & Staff Role Isolation (E2E)", () => {
  test("storefront header must provide account access and never expose admin links to customers", async ({
    page,
  }) => {
    await page.goto("/");

    // Storefront header has link to account
    const accountLink = page.locator('header a[href="/account"]');
    await expect(accountLink).toBeVisible();

    // Storefront header must NEVER contain admin links
    const adminLink = page.locator('header a[href^="/admin"]');
    await expect(adminLink).toHaveCount(0);
  });

  test("should display luxury access restricted page at /admin/access-denied", async ({
    page,
  }) => {
    await page.goto("/admin/access-denied");

    await expect(
      page.getByRole("heading", { name: /Access Restricted/i })
    ).toBeVisible();
    await expect(
      page.getByText(/You do not have the necessary administrative privileges/i)
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Storefront", exact: true })
    ).toBeVisible();
  });

  test("customer account page should render self-service navigation", async ({
    page,
  }) => {
    await page.goto("/account");

    await expect(
      page.getByText(/Client Portal/i)
    ).toBeVisible();
    await expect(page.getByText(/Personal Information/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Communication Preferences/i })).toBeVisible();
  });

  test("admin dashboard page renders sidebar navigation", async ({ page }) => {
    await page.goto("/admin");

    // Admin layout sidebar
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.locator("aside").getByText("VÉRONA")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Operations Dashboard/i })).toBeVisible();
  });
});
