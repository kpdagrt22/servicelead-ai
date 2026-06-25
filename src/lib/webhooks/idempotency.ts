import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Webhook idempotency (T-07).
 *
 * Twilio resends inbound webhooks on timeout and Stripe redelivers events;
 * without a dedupe key a retry re-runs the handler and can duplicate work.
 *
 * IMPORTANT ordering: we CHECK (read-only) before processing and only MARK after
 * the handler succeeds. Recording before processing would poison the retry — a
 * first attempt that times out or is rate-limited would commit the id, and
 * Twilio's legitimate retry (which only fires on a non-200/timeout) would be
 * deduped and the lead lost. Recording after success means a timed-out attempt
 * is simply reprocessed (find-or-create keeps it from duplicating the lead),
 * honoring the "never drop an inbound lead" invariant.
 */

function eventKey(provider: "stripe" | "twilio", id: string): string {
  return `${provider}:${id}`;
}

/** Has this webhook id already been fully processed? Read-only; fails open. */
export async function isWebhookProcessed(
  supabase: SupabaseClient,
  id: string | null | undefined,
  provider: "stripe" | "twilio",
): Promise<boolean> {
  if (!id) return false;
  try {
    const { data } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("id", eventKey(provider, id))
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false; // fail open → process it
  }
}

/**
 * Record a webhook id as processed. Call ONLY after the handler has succeeded.
 * Ignores all errors (including the unique-violation from a concurrent retry).
 */
export async function markWebhookProcessed(
  supabase: SupabaseClient,
  id: string | null | undefined,
  provider: "stripe" | "twilio",
  eventType?: string | null,
): Promise<void> {
  if (!id) return;
  try {
    await supabase
      .from("webhook_events")
      .insert({ id: eventKey(provider, id), provider, event_type: eventType ?? null });
  } catch {
    // ignore — duplicate (already recorded) or transient storage error
  }
}
