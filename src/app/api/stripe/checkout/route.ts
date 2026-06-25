import { NextResponse, type NextRequest } from "next/server";
import { requireOrg } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/stripe/client";
import { PLANS, type Plan } from "@/lib/constants";

/**
 * Creates a Stripe Checkout session for the selected plan and returns its URL.
 * Placeholder-friendly: returns a clear 503 when Stripe isn't configured so the
 * billing page can show "billing not configured".
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const ctx = await requireOrg();
  const { planId } = (await req.json().catch(() => ({}))) as {
    planId?: Plan["id"];
  };
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "Unknown plan" }, { status: 400 });
  }

  const priceId = priceIdForPlan(plan.id);
  if (!priceId) {
    return NextResponse.json(
      {
        ok: false,
        error: `No Stripe price configured for the ${plan.name} plan (set STRIPE_PRICE_${plan.id.toUpperCase()}).`,
      },
      { status: 503 },
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.app.url}/app/billing?status=success`,
    cancel_url: `${env.app.url}/app/billing?status=cancelled`,
    client_reference_id: ctx.organization.id,
    customer_email: ctx.organization.notification_email ?? ctx.email ?? undefined,
    metadata: { organization_id: ctx.organization.id, plan: plan.id },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
