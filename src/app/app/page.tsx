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

  const todayIso = startOfToday();
  const leadCount = () =>
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

  // Metrics are computed with exact COUNT queries (not a bounded slice) so they
  // stay correct past 200 leads.
  const [
    { count: total },
    { count: newToday },
    { count: urgent },
    { count: recovered },
    { count: contacted },
    { count: won },
    { count: openConversations },
    { count: bookedAppointments },
    leadsThisMonth,
    aiSummariesThisMonth,
    { data: recentRows },
  ] = await Promise.all([
    leadCount(),
    leadCount().gte("created_at", todayIso),
    leadCount()
      .in("urgency", ["emergency", "high"])
      .not("status", "in", "(won,lost,archived,spam)"),
    leadCount().eq("source", "missed_call"),
    leadCount().neq("status", "new"),
    leadCount().eq("status", "won"),
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
    supabase
      .from("leads")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  // Exact per-column counts for the board headers.
  const boardCountsArr = await Promise.all(
    BOARD_COLUMNS.map((s) =>
      leadCount().eq("status", s).then((r) => r.count ?? 0),
    ),
  );
  const boardCountByStatus = Object.fromEntries(
    BOARD_COLUMNS.map((s, i) => [s, boardCountsArr[i]]),
  ) as Record<string, number>;

  const totalLeads = total ?? 0;
  const contactedN = contacted ?? 0;
  const responseRate =
    totalLeads > 0 ? Math.round((contactedN / totalLeads) * 100) : 0;

  const recentAll = (recentRows ?? []) as Lead[];
  const recent = recentAll.slice(0, 8);
  const byStatus = (status: string) =>
    recentAll.filter((l) => l.status === status);
  const publicUrl = `${env.app.url}/u/${ctx.organization.slug}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {ctx.organization.name} · {totalLeads} total leads
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
        <StatCard label="New leads today" value={newToday ?? 0} accent />
        <StatCard label="Urgent leads" value={urgent ?? 0} />
        <StatCard label="Open conversations" value={openConversations ?? 0} />
        <StatCard label="Missed-call recovered" value={recovered ?? 0} />
        <StatCard label="Leads this month" value={leadsThisMonth} />
        <StatCard label="AI summaries this month" value={aiSummariesThisMonth} />
        <StatCard label="Booked appointments" value={bookedAppointments ?? 0} />
        <StatCard label="Total leads" value={totalLeads} />
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
          <p className="text-sm text-gray-500">Leads won</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">{won ?? 0}</p>
          <p className="text-xs text-gray-400">
            Leads you marked as won.
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Leads contacted</p>
          <p className="mt-1 text-2xl font-bold">{responseRate}%</p>
          <p className="text-xs text-gray-400">
            {contactedN} of {totalLeads} leads moved past “new”.
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
                    {boardCountByStatus[status] ?? 0}
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
                  {items.length === 0 &&
                    ((boardCountByStatus[status] ?? 0) > 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">
                        {boardCountByStatus[status]}{" "}
                        {LEAD_STATUS_LABELS[status].toLowerCase()} — view all
                      </p>
                    ) : (
                      <p className="py-4 text-center text-xs text-gray-300">
                        No {LEAD_STATUS_LABELS[status].toLowerCase()} leads
                      </p>
                    ))}
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
