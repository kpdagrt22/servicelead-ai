import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { alreadyProcessed } from "@/lib/webhooks/idempotency";

export const dynamic = "force-dynamic";

/** Read current_period_end from the subscription, tolerating API-version drift
 * (it moved from the top level onto subscription items in newer versions). */
function periodEndIso(sub: {
  current_period_end?: number | null;
  items?: { data?: { current_period_end?: number | null }[] };
}): string | null {
  const ts =
    sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/**
 * Stripe webhook. Verifies the signature, dedupes by event id (T-07), and keeps
 * the org's subscription row in sync on checkout / subscription / invoice
 * events.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !env.stripe.webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Billing not configured." },
      { status: 503 },
    );
  }

  const stripe = await getStripe();
  if (!stripe) return new NextResponse("not configured", { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, env.stripe.webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency: Stripe redelivers events; a duplicate is a no-op (T-07).
  if (await alreadyProcessed(supabase, event.id, "stripe", event.type)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as {
          metadata?: { organization_id?: string; plan?: string };
          customer?: string;
          subscription?: string;
        };
        const orgId = s.metadata?.organization_id;
        if (orgId) {
          await supabase.from("subscriptions").upsert(
            {
              organization_id: orgId,
              stripe_customer_id: (s.customer as string) ?? null,
              stripe_subscription_id: (s.subscription as string) ?? null,
              plan: s.metadata?.plan ?? null,
              status: "active",
            },
            { onConflict: "organization_id" },
          );
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as {
          id: string;
          status: string;
          current_period_end?: number;
          items?: { data?: { current_period_end?: number | null }[] };
          customer?: string;
          metadata?: { organization_id?: string; plan?: string };
        };
        const orgId = sub.metadata?.organization_id;
        const patch: Record<string, unknown> = {
          status:
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : sub.status,
          current_period_end: periodEndIso(sub),
          stripe_subscription_id: sub.id,
        };
        if (sub.metadata?.plan) patch.plan = sub.metadata.plan;
        if (orgId) {
          await supabase
            .from("subscriptions")
            .update(patch)
            .eq("organization_id", orgId);
        } else {
          await supabase
            .from("subscriptions")
            .update(patch)
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as {
          subscription?: string;
          customer?: string;
        };
        if (inv.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", inv.subscription);
        } else if (inv.customer) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_customer_id", inv.customer);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return new NextResponse("handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
