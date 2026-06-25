import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhoneOrRaw } from "@/lib/phone";

/**
 * Resolve which organization owns an inbound Twilio number (T-01).
 *
 * - Looks up twilio_numbers by the (normalized) receiving number and reads the
 *   query error explicitly, so a duplicate/edge result never silently drops the
 *   lead. The 0006 unique(phone_number) constraint makes duplicates impossible
 *   going forward; this stays defensive.
 * - Single-tenant fallback fires ONLY when exactly one organization exists. In a
 *   multi-tenant deployment an unmapped number returns undefined (the caller
 *   logs and no-ops) rather than mis-attributing a stranger's message.
 */
export async function resolveOrgForInboundNumber(
  supabase: SupabaseClient,
  toNumber: string | null | undefined,
): Promise<string | undefined> {
  const to = normalizePhoneOrRaw(toNumber);

  if (to) {
    const { data, error } = await supabase
      .from("twilio_numbers")
      .select("organization_id")
      .eq("phone_number", to)
      .maybeSingle();
    if (error) {
      console.error("[twilio/routing] number lookup failed", error);
      // fall through to the single-tenant fallback rather than throwing
    } else if (data?.organization_id) {
      return data.organization_id as string;
    }
  }

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .limit(2);
  if (orgs && orgs.length === 1) return orgs[0].id as string;
  return undefined;
}
