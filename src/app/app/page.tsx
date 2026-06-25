import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadRow } from "@/components/app/lead-row";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/ui/badges";
import { BOARD_COLUMNS } from "@/lib/leads/status";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import {
  getMonthlyAiSummaryCount,
  getMonthlyLeadCount,
} from "@/lib/billing/usage";
import { env } from "@/lib/env";
import type { Lead } from "@/types/database";

export const metadata = { title: "Dashboard — ServiceLead AI" };

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function DashboardPage() {
  const ctx = await requireOrg();
  const orgId = ctx.organization.id;
  const supabase = await createClient();

  const [
    { data: leads },
    { count: openConversations },
    { count: bookedAppointments },
    leadsThisMonth,
    aiSummariesThisMonth,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "open"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    getMonthlyLeadCount(supabase, orgId),
    getMonthlyAiSummaryCount(supabase, orgId),
  ]);

  const all = (leads ?? []) as Lead[];
  const todayIso = startOfToday();
  const newToday = all.filter((l) => l.created_at >= todayIso).length;
  const recovered = all.filter((l) => l.source === "missed_call").length;
  const urgent = all.filter(
    (l) =>
      (l.urgency === "emergency" || l.urgency === "high") &&
      l.status !== "won" &&
      l.status !== "lost" &&
      l.status !== "archived" &&
      l.status !== "spam",
  ).length;
  const contacted = all.filter((l) => l.status !== "new").length;
  const responseRate =
    all.length > 0 ? Math.round((contacted / all.length) * 100) : 0;

  const byStatus = (status: string) => all.filter((l) => l.status === status);
  const recent = all.slice(0, 8);
  const publicUrl = `${env.app.url}/u/${ctx.organization.slug}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {ctx.organization.name} · {all.length} total leads
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/simulator" className="btn-primary">
            Test lead intake
          </Link>
          <Link href="/app/intake" className="btn-secondary">
            Set up service categories
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New leads today" value={newToday} accent />
        <StatCard label="Urgent leads" value={urgent} />
        <StatCard label="Open conversations" value={openConversations ?? 0} />
        <StatCard label="Missed-call recovered" value={recovered} />
        <StatCard label="Leads this month" value={leadsThisMonth} />
        <StatCard label="AI summaries this month" value={aiSummariesThisMonth} />
        <StatCard label="Booked appointments" value={bookedAppointments ?? 0} />
        <StatCard label="Total leads" value={all.length} />
      </div>

      {/* CTA cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CtaCard
          href="/app/intake"
          title="Configure services"
          body="Set the services you offer and the questions AI asks."
        />
        <CtaCard
          href="/app/simulator"
          title="Test missed-call simulator"
          body="See the full recovery flow without any telephony."
        />
        <CtaCard
          href={publicUrl}
          title="Open public intake form"
          body="Share this link so customers can submit requests."
          external
        />
        <CtaCard
          href="/app/leads"
          title="View lead dashboard"
          body="Browse, filter, and follow up on every lead."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Avg first response</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">Instant</p>
          <p className="text-xs text-gray-400">
            AI auto-replies the moment a lead comes in.
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Leads contacted</p>
          <p className="mt-1 text-2xl font-bold">{responseRate}%</p>
          <p className="text-xs text-gray-400">
            {contacted} of {all.length} leads moved past “new”.
          </p>
        </div>
      </div>

      {/* Status board */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Lead status board</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {BOARD_COLUMNS.map((status) => {
            const items = byStatus(status);
            return (
              <div key={status} className="card flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                  <StatusBadge status={status} />
                  <span className="text-xs font-medium text-gray-400">
                    {items.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-3">
                  {items.slice(0, 5).map((l) => (
                    <Link
                      key={l.id}
                      href={`/app/leads/${l.id}`}
                      className="block rounded-lg border border-gray-100 p-2 text-xs hover:bg-gray-50"
                    >
                      <p className="truncate font-medium">
                        {l.customer_name || l.customer_phone || "Unknown"}
                      </p>
                      <p className="truncate text-gray-500">
                        {l.service_needed || "—"}
                      </p>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-300">
                      No {LEAD_STATUS_LABELS[status].toLowerCase()} leads
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent leads */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent leads</h2>
          <Link href="/app/leads" className="text-sm font-medium text-brand-600">
            View all →
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="card overflow-hidden">
            {recent.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No leads yet"
            body="Run a test through the simulator or share your public intake form to see your first lead here."
            ctaLabel="Test lead intake"
            ctaHref="/app/simulator"
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-extrabold ${accent ? "text-brand-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function CtaCard({
  href,
  title,
  body,
  external,
}: {
  href: string;
  title: string;
  body: string;
  external?: boolean;
}) {
  const className =
    "card flex flex-col p-5 transition hover:border-brand-300 hover:shadow";
  const inner = (
    <>
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{body}</p>
      <span className="mt-3 text-sm font-medium text-brand-600">Open →</span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
