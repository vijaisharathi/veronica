import { test, expect } from "@playwright/test";

test.describe("VÉRONA Foundation Verification (E2E)", () => {
  test("should render the application shell with branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/VÉRONA/);
    const logo = page.locator("header").getByText("VÉRONA");
    await expect(logo).toBeVisible();
  });

  test("should return 200 OK from /api/health", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("VÉRONA");
  });
});
