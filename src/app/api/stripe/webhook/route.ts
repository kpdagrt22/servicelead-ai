import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature and upserts the org's subscription row
 * on checkout/subscription events. Placeholder coverage for the core events —
 * extend as needed.
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
          metadata?: { organization_id?: string };
        };
        const orgId = sub.metadata?.organization_id;
        const patch = {
          status: sub.status,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        };
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
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return new NextResponse("handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
