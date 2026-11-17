import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

/** Test-only credentials for the LOCAL e2e database (never used against a real service). */
export const E2E_PASSWORD = "e2e-local-password-123";

export function uniqueEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@loriyum.test`;
}

/** Waits for the local outbox (written when RESEND_API_KEY is unset) to contain a link. */
export async function readEmailLink(to: string, pattern: RegExp): Promise<string> {
  const dir = path.join(process.cwd(), ".local-outbox");
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const files = await readdir(dir).catch(() => [] as string[]);
    for (const file of files.sort().reverse()) {
      const email = JSON.parse(await readFile(path.join(dir, file), "utf8")) as {
        to: string;
        text: string;
      };
      const match = email.to === to ? email.text.match(pattern) : null;
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} matching ${pattern}`);
}

/** Signs up through the UI and confirms the email; ends on the dashboard. */
export async function signUpAndVerify(page: Page, email: string, name = "Test Owner") {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email/);

  const link = await readEmailLink(email, /https?:\/\/\S+\/api\/auth\/verify-email\?\S+/);
  // Follow the link on the test server's origin.
  const url = new URL(link);
  await page.goto(url.pathname + url.search);
  await expect(page).toHaveURL(/\/dashboard$/);
}
