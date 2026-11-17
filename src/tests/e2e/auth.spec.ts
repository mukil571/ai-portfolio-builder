import { expect, test } from "@playwright/test";

test.describe("route protection", () => {
  test("unauthenticated /dashboard redirects to login with next", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("nested dashboard routes are protected too", async ({ page }) => {
    await page.goto("/dashboard/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fnew$/);
  });

  test("a forged session cookie still can't see the dashboard", async ({ page, context }) => {
    await context.addCookies([
      { name: "better-auth.session_token", value: "forged.value", url: "http://localhost:3100" },
    ]);
    await page.goto("/dashboard");
    // proxy lets the cookie through; requireUser() rejects it server-side.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("My Websites")).toHaveCount(0);
  });
});

test.describe("auth pages", () => {
  test("signup form validates before submitting", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  });

  test("login links to signup and password reset", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  test("reset page without a token explains the link is invalid", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("This reset link is invalid or has expired.")).toBeVisible();
  });
});
