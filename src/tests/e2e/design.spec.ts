import { expect, test } from "@playwright/test";

import { signUpAndVerify, uniqueEmail } from "./helpers";

test.setTimeout(4 * 60_000);

test("owner picks a business template, then switches design without losing content", async ({
  page,
}, info) => {
  const tag = `design${info.project.name.split("-")[0]}${Date.now().toString(36)}`;
  const name = `Design Test ${tag}`;
  const slug = name.toLowerCase().replaceAll(" ", "-");
  await signUpAndVerify(page, uniqueEmail(tag));

  // Wizard: a business site starts from a business template.
  await page.getByRole("link", { name: "Create website" }).click();
  await page.getByText("Business / Product", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Studio", { exact: true }).click();
  await page.getByRole("button", { name: "Use Studio" }).click();
  await expect(page).toHaveURL(/\/setup\/content$/);
  const hero = page.locator("section", { has: page.getByText("Home", { exact: true }) }).first();
  await hero.getByLabel("Your name or business name").fill(name);
  await hero.getByLabel("Headline").fill("Fresh bread every morning.");
  await expect(hero.getByText("Saved")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/setup\/knowledge$/);
  await expect(page.getByRole("heading", { name: /Approved facts/ })).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/setup\/publish$/);
  await expect(page.getByLabel("Site address")).toHaveValue(slug);
  await expect(page.getByText("is available")).toBeVisible();
  await page.getByRole("button", { name: "Deploy site" }).click();
  await expect(page.getByRole("heading", { name: "Your site is live" })).toBeVisible();

  await page.goto(`/site/${slug}`);
  await expect(page.locator("#site-root")).toHaveAttribute("data-template", "studio");

  // Design tab: switch to Local Pro with a custom accent and dark mode.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /^Design for / }).click();
  await expect(page.getByRole("heading", { name: /Design/ })).toBeVisible();
  await page.getByText("Local Pro", { exact: true }).click();
  await page.getByRole("button", { name: "Accent #0891b2" }).click();
  await page.getByLabel("Visitors first see").selectOption("dark");
  await page.getByLabel("Page title").fill(`${name} bakery`);
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText("Design saved.")).toBeVisible();

  // The live site changes look immediately; the content is untouched.
  await page.goto(`/site/${slug}`);
  const root = page.locator("#site-root");
  await expect(root).toHaveAttribute("data-template", "local-pro");
  await expect(root).toHaveAttribute("data-mode", "dark");
  await expect(root).toHaveAttribute("style", /--site-accent:\s*#0891b2/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Fresh bread every morning.")).toBeVisible();
  await expect(page).toHaveTitle(`${name} bakery`);
});
