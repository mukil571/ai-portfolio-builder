import { expect, test } from "@playwright/test";

import { signUpAndVerify, uniqueEmail } from "./helpers";

test.setTimeout(5 * 60_000); // Phase 3 goal: the whole flow fits in under 5 minutes.

test("new owner signs up, builds a site in the wizard and publishes it", async ({ page }, info) => {
  const tag = `${info.project.name.split("-")[0]}${Date.now().toString(36)}`;
  const heroName = `Wizard Test ${tag}`;
  const expectedSlug = heroName.toLowerCase().replaceAll(" ", "-");

  await signUpAndVerify(page, uniqueEmail(tag));
  await expect(page.getByRole("heading", { name: "No websites yet" })).toBeVisible();

  // Steps 1-2: type and template.
  await page.getByRole("link", { name: "Create website" }).click();
  await page.getByText("Portfolio", { exact: true }).click();
  await page.getByLabel("Site name").fill("My test portfolio");
  await page.getByRole("button", { name: "Continue" }).click();
  // All four portfolio templates are offered, each with a live sample preview.
  for (const name of ["Minimal Mono", "Bento", "Dark Dev", "Editorial"]) {
    await expect(page.locator(`iframe[title="${name} template preview"]`)).toBeAttached();
  }
  await page.getByRole("button", { name: "Use Minimal Mono" }).click();
  await expect(page).toHaveURL(/\/setup\/content$/);

  // Step 3: content with autosave (Hero and About start expanded).
  const hero = page.locator("section", { has: page.getByText("Home", { exact: true }) }).first();
  await hero.getByLabel("Your name or business name").fill(heroName);
  await hero.getByLabel("Headline").fill("I build calm, fast web apps.");
  await expect(hero.getByText("Saved")).toBeVisible();
  await expect(hero.getByText(/^Shown/)).toBeVisible();

  const about = page.locator("section", { has: page.getByText("About", { exact: true }) }).first();
  await about.getByLabel("About you").fill("Eight years of shipping web products.");
  await expect(about.getByText("Saved")).toBeVisible();

  await page.getByRole("link", { name: "Continue" }).click();

  // Step 4: knowledge base (covered in knowledge.spec.ts); continue to publish.
  await expect(page.getByRole("heading", { name: /Approved facts/ })).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();

  // Step 5: address + deploy.
  const slugInput = page.getByLabel("Site address");
  await expect(slugInput).toHaveValue(expectedSlug);
  await expect(page.getByText("is available")).toBeVisible();

  await slugInput.fill("dashboard");
  await expect(page.getByText("That address is reserved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deploy site" })).toBeDisabled();

  await slugInput.fill(expectedSlug);
  await expect(page.getByText("is available")).toBeVisible();
  await page.getByRole("button", { name: "Deploy site" }).click();
  await expect(page.getByRole("heading", { name: "Your site is live" })).toBeVisible();

  // The public site renders the content; empty sections are omitted.
  const response = await page.goto(`/site/${expectedSlug}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heroName })).toBeVisible();
  await expect(page.locator("#about")).toBeVisible();
  await expect(page.locator("#projects")).toHaveCount(0);

  // Dashboard shows it as live with its link.
  await page.goto("/dashboard");
  await expect(page.getByText("Live")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`/site/${expectedSlug}`) })).toBeVisible();
});
