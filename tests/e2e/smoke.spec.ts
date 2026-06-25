import { test, expect } from "@playwright/test";

/**
 * Smoke E2E that runs without any backend configured. Verifies the marketing
 * surface renders and core navigation works.
 *
 * The full vertical-slice flow (sign up → onboard → configure category →
 * public intake → lead in dashboard → AI summary) requires a live Supabase
 * project; that scenario is documented in docs/VALIDATION_PLAN.md and can be
 * automated once test credentials are wired up. It is intentionally kept out of
 * the default run so `npm run test:e2e` passes on a fresh checkout.
 */

test("landing page renders the core promise and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Recover missed calls before they become lost customers/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Set Up Missed Call Recovery/i }).first(),
  ).toBeVisible();
});

test("pricing page lists all three plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Starter")).toBeVisible();
  await expect(page.getByText("Pro")).toBeVisible();
  await expect(page.getByText("Growth")).toBeVisible();
});

test("signup page loads (or shows a configure-Supabase notice)", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByText(/Set up missed-call recovery|Supabase not configured/i)).toBeVisible();
});
