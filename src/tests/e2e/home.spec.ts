import { expect, test } from "@playwright/test";

test("home page loads with the Loriyum heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Loriyum/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
