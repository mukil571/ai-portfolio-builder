import { readFileSync } from "node:fs";

import { expect, test, type Browser, type Page } from "@playwright/test";

import { readEmailLink, signUpAndVerify, uniqueEmail } from "./helpers";

/** The loop needs the real platform AI (embeddings + chat), configured in .env.local. */
function hasLocalAiKey(): boolean {
  try {
    return /^GOOGLE_GENERATIVE_AI_API_KEY="?[^"\s]+/m.test(readFileSync(".env.local", "utf8"));
  } catch {
    return false;
  }
}

test.setTimeout(5 * 60_000);

const QUESTION = "Do you offer a discount for nonprofit organisations?";
const ANSWER = "Yes, registered nonprofits get 15% off every project.";

/** A fresh visitor (own cookies) asks the site's assistant one question. */
async function visitorAsks(browser: Browser, slug: string, owner: string, question: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/site/${slug}`);
  await page.getByRole("button", { name: `Chat with ${owner}'s assistant` }).click();
  // Real people take a moment to type; an instant send is treated as a bot.
  await page.waitForTimeout(900);
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
  return { page, close: () => context.close() };
}

async function lastReply(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Checking .* info/)).toHaveCount(0, { timeout: 60_000 });
  return dialog;
}

test("visitor question -> inbox -> owner answers -> next visitor gets it -> asker emailed", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop-chromium", "One full loop is enough (real AI calls).");
  test.skip(!hasLocalAiKey(), "Needs GOOGLE_GENERATIVE_AI_API_KEY in .env.local.");

  // Letters only: the owner name is shown in answers, and digits there would trip the
  // "numbers must come from facts" check.
  const tag = `loop${Date.now()
    .toString(26)
    .replace(/./g, (c) => String.fromCharCode(97 + parseInt(c, 26)))}`;
  const owner = `Loop Owner ${tag}`;
  const slug = owner.toLowerCase().replaceAll(" ", "-");
  const ownerEmail = uniqueEmail(tag);
  const visitorEmail = uniqueEmail(`visitor${tag}`);

  // Owner: site with the assistant on, published.
  await signUpAndVerify(page, ownerEmail);
  await page.getByRole("link", { name: "Create website" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Use Minimal Mono" }).click();
  const hero = page.locator("section", { has: page.getByText("Home", { exact: true }) }).first();
  await hero.getByLabel("Your name or business name").fill(owner);
  await expect(hero.getByText("Saved")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  const assistant = page.getByRole("switch", { name: "Enable assistant on my site" });
  await assistant.click();
  await expect(assistant).toHaveAttribute("aria-checked", "true");
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByLabel("Site address")).toHaveValue(slug);
  await expect(page.getByText("is available")).toBeVisible();
  await page.getByRole("button", { name: "Deploy site" }).click();
  await expect(page.getByRole("heading", { name: "Your site is live" })).toBeVisible();

  // Visitor 1 asks something unknown and asks to be emailed.
  const v1 = await visitorAsks(browser, slug, owner, QUESTION);
  const d1 = await lastReply(v1.page);
  await expect(d1.getByText(/I don't have that from .* yet/)).toBeVisible();
  await d1.getByLabel("Your email").fill(visitorEmail);
  await d1.getByRole("button", { name: "Email me" }).click();
  await expect(d1.getByText(/we'll email you/)).toBeVisible();
  await v1.close();

  // Visitor 2 asks the same thing: it's counted, not duplicated.
  const v2 = await visitorAsks(browser, slug, owner, QUESTION);
  await expect((await lastReply(v2.page)).getByText(/I don't have that from/)).toBeVisible();
  await v2.close();

  // The owner got an instant email pointing at the inbox.
  await readEmailLink(ownerEmail, /\/dashboard\/sites\/[0-9a-f-]+\/questions/);

  // Owner: the inbox shows it with its count and the waiting visitor.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /unanswered questions for/ }).click();
  await expect(page.getByRole("heading", { name: /Questions/ })).toBeVisible();
  const item = page.getByRole("listitem").filter({ hasText: QUESTION });
  await expect(item.getByText("Asked 2×")).toBeVisible();
  await expect(item.getByText("1 visitor waiting for an email")).toBeVisible();

  // Owner answers publicly.
  await item.getByRole("button", { name: "Answer" }).click();
  await item.getByLabel("Your answer").fill(ANSWER);
  await item.getByRole("button", { name: "Approve answer" }).click();
  await expect(page.getByText(/answer this for every visitor/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Emailed 1 visitor who asked.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: /Answered/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: QUESTION })).toBeVisible();

  // A new visitor gets the answer instantly, with the verified badge.
  const v3 = await visitorAsks(browser, slug, owner, QUESTION);
  const d3 = await lastReply(v3.page);
  await expect(d3.getByText(/15%/)).toBeVisible();
  await expect(d3.getByText(`Verified by ${owner}`)).toBeVisible();
  await v3.close();

  // Visitor 1 got the "answered" email with the owner's words.
  await readEmailLink(visitorEmail, /15% off every project/);
});
