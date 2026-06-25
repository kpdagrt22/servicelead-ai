import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/constants";

/**
 * Lightweight usage tracking + plan limits.
 *
 * IMPORTANT product decision: we never DROP an inbound lead because of a usage
 * cap — silently losing a missed-call lead would defeat the entire product
 * promise. Limits are therefore *soft*: we measure usage, surface it, and prompt
 * an upgrade when exceeded, but capture continues. Hard enforcement (if ever
 * needed) belongs at the billing/UX layer, not at lead ingestion.
 */

/** Demo/trial cap when an org has no active paid subscription. */
export const TRIAL_LEAD_CAP = 25;

export function planLeadCap(planId: string | null | undefined): number {
  const plan = PLANS.find((p) => p.id === planId);
  return plan ? plan.leadCap : TRIAL_LEAD_CAP;
}

export interface UsageEvaluation {
  used: number;
  limit: number;
  remaining: number;
  withinLimit: boolean;
  percentUsed: number;
}

/** Pure evaluation — easy to unit test. */
export function evaluateUsage(used: number, limit: number): UsageEvaluation {
  const safeLimit = Math.max(0, limit);
  const remaining = Math.max(0, safeLimit - used);
  return {
    used,
    limit: safeLimit,
    remaining,
    withinLimit: used < safeLimit,
    percentUsed:
      safeLimit > 0 ? Math.min(100, Math.round((used / safeLimit) * 100)) : 100,
  };
}

function startOfMonthISO(now: Date = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getMonthlyLeadCount(
  supabase: SupabaseClient,
  organizationId: string,
  now?: Date,
): Promise<number> {
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", startOfMonthISO(now));
  return count ?? 0;
}

export async function getMonthlyAiSummaryCount(
  supabase: SupabaseClient,
  organizationId: string,
  now?: Date,
): Promise<number> {
  const { count } = await supabase
    .from("ai_intake_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", startOfMonthISO(now));
  return count ?? 0;
}

export async function getActivePlan(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (data && (data.status === "active" || data.status === "trialing")) {
    return (data.plan as string) ?? null;
  }
  return null;
}

export interface UsageSummary {
  plan: string | null;
  isTrial: boolean;
  leads: UsageEvaluation;
}

export async function getUsageSummary(
  supabase: SupabaseClient,
  organizationId: string,
  now?: Date,
): Promise<UsageSummary> {
  const [plan, leadsThisMonth] = await Promise.all([
    getActivePlan(supabase, organizationId),
    getMonthlyLeadCount(supabase, organizationId, now),
  ]);
  return {
    plan,
    isTrial: !plan,
    leads: evaluateUsage(leadsThisMonth, planLeadCap(plan)),
  };
}
