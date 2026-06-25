import { NextResponse } from "next/server";
import { requireOrgOwnerOrAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/**
 * Opens the Stripe Customer Billing Portal so a customer can update payment
 * method, view invoices, or cancel — closing the "no way to manage/cancel"
 * gap (T-08). Owner/admin only.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const ctx = await requireOrgOwnerOrAdmin();
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  const customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: "No billing account yet. Start a subscription first." },
      { status: 400 },
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.app.url}/app/billing`,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
