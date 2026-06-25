import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  env,
  isAdminEmail,
  isRealAiConfigured,
  isResendConfigured,
  isStripeConfigured,
  isSupabaseConfigured,
  isTwilioConfigured,
} from "@/lib/env";
import { getUsageSummary } from "@/lib/billing/usage";

export const metadata = { title: "Admin / debug — ServiceLead AI" };

/**
 * Internal admin/debug surface. Access is gated by the ADMIN_EMAILS allowlist;
 * non-admins get a 404 (we don't reveal the page exists). Shows configuration
 * and counts only — never secrets.
 */
export default async function AdminPage() {
  const ctx = await requireOrg();
  if (!isAdminEmail(ctx.email)) notFound();

  const supabase = await createClient();
  const orgId = ctx.organization.id;

  const [leads, conversations, messages, aiLogs, usage] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("ai_intake_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    getUsageSummary(supabase, orgId),
  ]);

  const integrations: [string, boolean | string][] = [
    ["Supabase", isSupabaseConfigured()],
    ["AI provider", env.ai.provider],
    ["Real AI", isRealAiConfigured()],
    ["Twilio", isTwilioConfigured()],
    ["Resend", isResendConfigured()],
    ["Stripe", isStripeConfigured()],
  ];

  const counts: [string, number][] = [
    ["Leads", leads.count ?? 0],
    ["Conversations", conversations.count ?? 0],
    ["Messages", messages.count ?? 0],
    ["AI intake logs", aiLogs.count ?? 0],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin / debug</h1>
        <p className="text-sm text-gray-500">
          Internal view for {ctx.email}. Configuration and counts only — no
          secrets.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Organization</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">ID</dt>
            <dd className="font-mono text-xs">{orgId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Slug</dt>
            <dd>{ctx.organization.slug}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Plan</dt>
            <dd>{usage.plan ?? "trial"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Leads this month</dt>
            <dd>
              {usage.leads.used} / {usage.leads.limit}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Integrations</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {integrations.map(([name, val]) => (
            <li key={name} className="flex justify-between">
              <span className="text-gray-500">{name}</span>
              <span className="font-medium">
                {typeof val === "boolean" ? (val ? "configured" : "—") : val}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Counts (this organization)</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map(([name, n]) => (
            <div key={name} className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold">{n}</p>
              <p className="text-xs text-gray-500">{name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
