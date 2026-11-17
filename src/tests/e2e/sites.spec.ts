import { expect, test } from "@playwright/test";

test("unknown or unpublished site returns a real 404", async ({ page }) => {
  const response = await page.goto("/site/no-such-site-here");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This site isn't available" })).toBeVisible();
});

test("malformed slug is a 404 without touching the database", async ({ page }) => {
  const response = await page.goto("/site/NOT_A_SLUG");
  expect(response?.status()).toBe(404);
});

test("template preview renders sample content and omits empty sections", async ({ page }) => {
  await page.goto("/templates/minimal-mono");
  await expect(page.getByRole("heading", { level: 1, name: "Alex Rivera" })).toBeVisible();
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator("#gallery")).toHaveCount(0);
  await expect(page.locator("#pricing")).toHaveCount(0);
});

test("mode toggle switches and remembers dark mode", async ({ page }) => {
  await page.goto("/templates/minimal-mono");
  const root = page.locator("#site-root");
  await expect(root).toHaveAttribute("data-mode", "light");
  // The toggle is a client component: retry the click until hydration has attached it.
  await expect(async () => {
    await page.getByRole("button", { name: "Toggle light and dark mode" }).click();
    await expect(root).toHaveAttribute("data-mode", "dark", { timeout: 1000 });
  }).toPass();
  await page.reload();
  await expect(root).toHaveAttribute("data-mode", "dark");
});

test("owner preview requires login", async ({ page }) => {
  await page.goto("/preview/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login\?next=%2Fpreview%2F/);
});
