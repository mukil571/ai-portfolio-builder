import { expect, test } from "@playwright/test";

import { signUpAndVerify, uniqueEmail } from "./helpers";

test.setTimeout(3 * 60_000);

test("owner manages the knowledge base from wizard step 4", async ({ page }, info) => {
  const tag = `kb${info.project.name.split("-")[0]}${Date.now().toString(36)}`;
  await signUpAndVerify(page, uniqueEmail(tag));

  // Create a site with a little content.
  await page.getByRole("link", { name: "Create website" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Use Minimal Mono" }).click();
  await expect(page).toHaveURL(/\/setup\/content$/);
  const hero = page.locator("section", { has: page.getByText("Home", { exact: true }) }).first();
  await hero.getByLabel("Your name or business name").fill(`KB Owner ${tag}`);
  await hero.getByLabel("Location").fill("Chennai, India");
  await expect(hero.getByText("Saved")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();

  // Step 4 is the real knowledge base now.
  await expect(page).toHaveURL(/\/setup\/knowledge$/);
  await expect(page.getByRole("heading", { name: /Approved facts/ })).toBeVisible();

  // Add a fact by hand. Without an embedding key locally it saves but isn't searchable.
  await page.getByLabel("Question a visitor might ask").fill("What is your hourly rate?");
  await page.getByLabel("Your answer").fill("My rate is $40/hour.");
  await page.getByRole("button", { name: "Add fact" }).click();
  const approved = page.locator("section", {
    has: page.getByRole("heading", { name: /Approved facts/ }),
  });
  await expect(approved.getByText("What is your hourly rate?")).toBeVisible();
  await expect(approved.getByText(/^Not searchable yet/)).toBeVisible();

  // Suggestions from site content arrive for review, not approved.
  await page.getByRole("button", { name: "Suggest from my site content" }).click();
  await expect(page.getByText(/suggested fact.* added for your review/)).toBeVisible();
  const review = page.locator("section", {
    has: page.getByRole("heading", { name: /Needs your review/ }),
  });
  await expect(review.getByText("Where are you based?")).toBeVisible();
  await expect(approved.getByText("Where are you based?")).toHaveCount(0);

  // Approve one suggestion -> it moves to approved.
  const based = review.locator("li", { hasText: "Where are you based?" });
  await based.getByRole("button", { name: "Approve" }).click();
  await expect(approved.getByText("Where are you based?")).toBeVisible();

  // Running it again doesn't duplicate anything.
  await page.getByRole("button", { name: "Suggest from my site content" }).click();
  await expect(page.getByText(/No new facts found/)).toBeVisible();

  // Delete the hand-written fact.
  page.once("dialog", (d) => void d.accept());
  await approved.getByRole("button", { name: "Delete: What is your hourly rate?" }).click();
  await expect(approved.getByText("What is your hourly rate?")).toHaveCount(0);

  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/setup\/publish$/);
});
