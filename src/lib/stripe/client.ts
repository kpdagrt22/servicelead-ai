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
  // Use the SDK's pinned default apiVersion (no `as never` cast / hidden drift).
  return new Stripe(env.stripe.secretKey!);
}

export function priceIdForPlan(planId: Plan["id"]): string | undefined {
  return env.stripe.prices[planId];
}

export { isStripeConfigured };
