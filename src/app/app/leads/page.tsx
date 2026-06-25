import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadRow } from "@/components/app/lead-row";
import { EmptyState } from "@/components/app/empty-state";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/database";

export const metadata = { title: "Leads — ServiceLead AI" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requireOrg();
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  const leads = (data ?? []) as Lead[];

  const filters: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...LEAD_STATUSES.map((s) => ({
      value: s,
      label: LEAD_STATUS_LABELS[s as LeadStatus],
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Link href="/app/simulator" className="btn-secondary">
          + Test lead
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = (status ?? "") === f.value;
          const href = f.value ? `/app/leads?status=${f.value}` : "/app/leads";
          return (
            <Link
              key={f.label}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {leads.length > 0 ? (
        <div className="card overflow-hidden">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No leads here"
          body="When a missed call, SMS, or form submission comes in, it'll show up in this list."
          ctaLabel="Run a test lead"
          ctaHref="/app/simulator"
        />
      )}
    </div>
  );
}
