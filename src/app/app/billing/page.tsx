import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConfigNotice } from "@/components/config-notice";
import { CheckoutButton } from "@/components/app/checkout-button";
import { ManageBillingButton } from "@/components/app/manage-billing-button";
import { isStripeConfigured } from "@/lib/env";
import { PLANS, SETUP_FEE } from "@/lib/constants";
import { getUsageSummary } from "@/lib/billing/usage";
import type { Subscription } from "@/types/database";

export const metadata = { title: "Billing — ServiceLead AI" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requireOrg();
  const { status } = await searchParams;
  const configured = isStripeConfigured();
  const supabase = await createClient();

  const [{ data: sub }, usage] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .maybeSingle(),
    getUsageSummary(supabase, ctx.organization.id),
  ]);
  const subscription = sub as Subscription | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-gray-500">
          Manage your subscription. You can use ServiceLead AI in trial /
          simulation mode without billing configured.
        </p>
      </div>

      {status === "success" && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          ✅ Subscription started — thank you!
        </p>
      )}
      {status === "cancelled" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Checkout cancelled — no changes made.
        </p>
      )}

      {!configured && (
        <ConfigNotice title="Billing not configured">
          <p>
            Set <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>,{" "}
            <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>, and your{" "}
            <code>STRIPE_PRICE_*</code> IDs to enable subscriptions. Until then
            the product works fully in trial mode.
          </p>
        </ConfigNotice>
      )}

      {subscription && (
        <div className="card p-5">
          <p className="text-sm text-gray-500">Current plan</p>
          <p className="mt-1 text-xl font-bold capitalize">
            {subscription.plan ?? "—"}{" "}
            <span className="text-sm font-medium text-gray-500">
              ({subscription.status})
            </span>
          </p>
          {subscription.current_period_end && (
            <p className="text-xs text-gray-400">
              Renews{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          {configured && subscription.stripe_customer_id && (
            <div className="mt-4">
              <ManageBillingButton />
            </div>
          )}
        </div>
      )}

      {/* Usage this month */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Leads recovered this month</p>
          <p className="text-sm text-gray-500">
            {usage.leads.used} / {usage.leads.limit}
            {usage.isTrial ? " (trial)" : ""}
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full ${usage.leads.withinLimit ? "bg-brand-500" : "bg-red-500"}`}
            style={{ width: `${usage.leads.percentUsed}%` }}
          />
        </div>
        {!usage.leads.withinLimit && (
          <p className="mt-2 text-xs text-amber-700">
            You've reached your plan's lead limit. We keep capturing leads so you
            never miss one — upgrade to lift the cap.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col p-6 ${plan.highlighted ? "ring-2 ring-brand-500" : ""}`}
          >
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-extrabold">
              ${plan.price}
              <span className="text-base font-medium text-gray-500">/mo</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <CheckoutButton
                plan={plan}
                disabled={!configured}
                highlighted={plan.highlighted}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        Optional concierge setup is a ${SETUP_FEE} one-time fee. We never claim
        guaranteed bookings or revenue.
      </p>
    </div>
  );
}
