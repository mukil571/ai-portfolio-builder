import { expect, test } from "@playwright/test";

import { signUpAndVerify, uniqueEmail } from "./helpers";

test.setTimeout(4 * 60_000);

// Made-up key for this test only: it must be refused and must never be echoed back.
const FAKE_KEY = "sk-e2e-not-a-real-key-000000000000wxyz";

test("owner picks how the assistant is powered and changes plan (simulated)", async ({
  page,
}, info) => {
  const tag = `ai${info.project.name.split("-")[0]}${Date.now().toString(36)}`;
  await signUpAndVerify(page, uniqueEmail(tag));

  // A fresh site; open its AI & API tab from the Design tab's tab bar.
  await page.getByRole("link", { name: "Create website" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Use Minimal Mono" }).click();
  await expect(page).toHaveURL(/\/setup\/content$/);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /^Design for / }).click();
  await page.getByRole("link", { name: "AI & API" }).click();
  await expect(page.getByRole("heading", { name: /AI & API/ })).toBeVisible();

  // New sites start "Off"; own-key mode needs a saved key first.
  await expect(page.getByRole("radio", { name: /Off/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /My own AI key/ })).toBeDisabled();

  // A bad key is tested, refused, and never shown back.
  await page.getByLabel("Provider", { exact: true }).selectOption("openai");
  await page.getByLabel("API key", { exact: true }).fill(FAKE_KEY);
  await page.getByRole("button", { name: "Test and save key" }).click();
  await expect(
    page.getByText(/provider rejected that key|couldn't reach the provider|usage or billing limit/),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue(FAKE_KEY); // still only in the owner's field
  await page.reload();
  expect(await page.content()).not.toContain(FAKE_KEY);

  // Plan & usage: Free shows its 50-message allowance; a simulated upgrade changes it.
  await page.getByRole("link", { name: "Plan & usage" }).first().click();
  await expect(page.getByText(/of 50 Loriyum-AI messages used/)).toBeVisible();
  await page.getByRole("button", { name: "Switch to Starter" }).click();
  await expect(page.getByText(/You're on Starter now/)).toBeVisible();
  await expect(page.getByText(/of 1,000 Loriyum-AI messages used/)).toBeVisible();
  await expect(page.getByText("Your current plan")).toBeVisible();
});
