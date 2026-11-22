import { expect, test } from "@playwright/test";

import { signUpAndVerify, uniqueEmail } from "./helpers";

test.setTimeout(5 * 60_000);

// Headless Chromium says "HeadlessChrome", which the visit counter ignores as a bot.
const REAL_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

test("overview, chatbot settings, unpublish, export and account deletion", async ({
  page,
  browser,
}, info) => {
  const tag = `ws${info.project.name.split("-")[0]}${Date.now().toString(36).replace(/\d/g, "")}`;
  const name = `Workspace ${tag}`;
  const slug = name.toLowerCase().replaceAll(" ", "-");
  const email = uniqueEmail(tag);
  await signUpAndVerify(page, email);

  // Build and publish a site with the assistant on.
  await page.getByRole("link", { name: "Create website" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Use Minimal Mono" }).click();
  await expect(page).toHaveURL(/\/setup\/content$/);
  const hero = page.locator("section", { has: page.getByText("Home", { exact: true }) }).first();
  await hero.getByLabel("Your name or business name").fill(name);
  await expect(hero.getByText("Saved")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/setup\/knowledge$/);
  const assistant = page.getByRole("switch", { name: "Enable assistant on my site" });
  await assistant.click();
  await expect(assistant).toHaveAttribute("aria-checked", "true");
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/setup\/publish$/);
  await expect(page.getByText("is available")).toBeVisible();
  await page.getByRole("button", { name: "Deploy site" }).click();
  await expect(page.getByRole("heading", { name: "Your site is live" })).toBeVisible();

  // A visitor's page view is counted (privately).
  const visitor = await browser.newContext({ userAgent: REAL_BROWSER_UA });
  const vp = await visitor.newPage();
  const visit = vp.waitForRequest((r) => r.url().endsWith("/api/visit"));
  await vp.goto(`/site/${slug}`);
  await visit;
  await visitor.close();

  // Overview shows it (empty states elsewhere are friendly).
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /overview$/ }).click();
  await expect(page.getByRole("heading", { name: /Overview/ })).toBeVisible();
  await expect(page.getByText("Your site is live")).toBeVisible();
  await expect(page.getByText("Visits", { exact: true }).locator("..")).toContainText("1");
  await page.getByRole("link", { name: "Conversations" }).click();
  await expect(page.getByText(/No chats yet/)).toBeVisible();
  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByText(/No chats in the last 30 days/)).toBeVisible();

  // Chatbot settings change the live widget.
  await page.getByRole("link", { name: "AI & API" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Ask Wally");
  await page.getByLabel("First message").fill("Hello there! Ask me about my work.");
  await page.getByLabel("Use my accent colour").check();
  await page.getByRole("button", { name: "Save chatbot" }).click();
  await expect(page.getByText("Chatbot settings saved.")).toBeVisible();
  await page.goto(`/site/${slug}`);
  await page.getByRole("button", { name: "Chat with Ask Wally" }).click();
  await expect(page.getByRole("dialog", { name: "Ask Wally" })).toContainText(
    "Hello there! Ask me about my work.",
  );

  // Unpublish -> 404; publish again -> live.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /overview$/ }).click();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Your site is offline")).toBeVisible();
  expect((await page.request.get(`/site/${slug}`)).status()).toBe(404);
  await page.getByRole("button", { name: "Publish again" }).click();
  await expect(page.getByText("Your site is live again.")).toBeVisible();
  expect((await page.request.get(`/site/${slug}`)).status()).toBe(200);

  // Export my data (JSON) contains the site, never secrets.
  const exported = await page.request.get("/api/account/export");
  expect(exported.status()).toBe(200);
  const body = await exported.text();
  expect(body).toContain(name);
  expect(body).not.toMatch(/password|encrypted/i);

  // Delete the account: everything goes, the site is offline, login no longer works.
  await page.getByRole("link", { name: "Account" }).first().click();
  await page.getByRole("button", { name: "Delete account…" }).click();
  await page.getByLabel(/Type your email/).fill(email);
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page).toHaveURL(/\/(\?deleted=1)?$/);
  expect((await page.request.get(`/site/${slug}`)).status()).toBe(404);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
