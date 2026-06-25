import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadRow } from "@/components/app/lead-row";
import { EmptyState } from "@/components/app/empty-state";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  URGENCY_LEVELS,
  type LeadSource,
  type LeadStatus,
} from "@/lib/constants";
import type { Lead } from "@/types/database";

export const metadata = { title: "Leads — ServiceLead AI" };

interface LeadsSearch {
  status?: string;
  urgency?: string;
  source?: string;
  q?: string;
  sort?: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadsSearch>;
}) {
  const ctx = await requireOrg();
  const sp = await searchParams;
  const supabase = await createClient();

  const status = LEAD_STATUSES.includes(sp.status as LeadStatus)
    ? (sp.status as LeadStatus)
    : "";
  const urgency = URGENCY_LEVELS.includes(sp.urgency as never)
    ? sp.urgency!
    : "";
  const source = LEAD_SOURCES.includes(sp.source as LeadSource)
    ? (sp.source as LeadSource)
    : "";
  const sort = sp.sort === "score" ? "score" : "newest";
  const q = (sp.q ?? "").slice(0, 80);
  const safeQ = q.replace(/[%,()]/g, "").trim();

  let query = supabase
    .from("leads")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .limit(500);

  if (status) query = query.eq("status", status);
  if (urgency) query = query.eq("urgency", urgency);
  if (source) query = query.eq("source", source);
  if (safeQ) {
    query = query.or(
      `customer_name.ilike.%${safeQ}%,customer_phone.ilike.%${safeQ}%,service_needed.ilike.%${safeQ}%`,
    );
  }

  query =
    sort === "score"
      ? query.order("lead_score", { ascending: false, nullsFirst: false })
      : query.order("created_at", { ascending: false });

  const { data } = await query;
  const leads = (data ?? []) as Lead[];

  const statusChips = [
    { value: "", label: "All" },
    ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })),
  ];

  // Preserve current filters when switching status via chips.
  const chipHref = (s: string) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (urgency) params.set("urgency", urgency);
    if (source) params.set("source", source);
    if (safeQ) params.set("q", safeQ);
    if (sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/app/leads?${qs}` : "/app/leads";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Link href="/app/simulator" className="btn-secondary">
          + Test lead
        </Link>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {statusChips.map((f) => {
          const active = status === f.value;
          return (
            <Link
              key={f.label}
              href={chipHref(f.value)}
              className={
                "rounded-full px-3 py-1.5 text-sm font-medium " +
                (active
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Filters: search + urgency + source + sort */}
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex-1">
          <label className="label">Search</label>
          <input
            name="q"
            defaultValue={q}
            className="input"
            placeholder="Name, phone, or service"
          />
        </div>
        <div>
          <label className="label">Urgency</label>
          <select name="urgency" defaultValue={urgency} className="input">
            <option value="">Any</option>
            {URGENCY_LEVELS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Source</label>
          <select name="source" defaultValue={source} className="input">
            <option value="">Any</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {LEAD_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sort</label>
          <select name="sort" defaultValue={sort} className="input">
            <option value="newest">Newest</option>
            <option value="score">Highest score</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Apply
        </button>
        <Link href="/app/leads" className="btn-ghost text-sm">
          Reset
        </Link>
      </form>

      <p className="text-sm text-gray-500">{leads.length} lead(s)</p>

      {leads.length > 0 ? (
        <div className="card overflow-hidden">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No leads match"
          body="Adjust your filters, or run a test lead through the simulator to see the flow."
          ctaLabel="Run a test lead"
          ctaHref="/app/simulator"
        />
      )}
    </div>
  );
}
