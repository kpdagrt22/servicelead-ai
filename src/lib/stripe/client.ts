import { env, isStripeConfigured } from "@/lib/env";
import type { Plan } from "@/lib/constants";

/**
 * Stripe billing abstraction. Stripe is fully optional — every entry point
 * checks `isStripeConfigured()` first and the UI shows "billing not configured"
 * when keys are missing. The `stripe` package is an optional dependency.
 */

export async function getStripe() {
  if (!isStripeConfigured()) return null;
  const Stripe = (await import("stripe")).default;
  return new Stripe(env.stripe.secretKey!, { apiVersion: "2024-06-20" as never });
}

export function priceIdForPlan(planId: Plan["id"]): string | undefined {
  return env.stripe.prices[planId];
}

export { isStripeConfigured };
