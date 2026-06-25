import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Webhook idempotency (T-07).
 *
 * Twilio resends inbound webhooks on timeout and Stripe redelivers events;
 * without a dedupe key a retry re-runs the handler and creates duplicate
 * leads/AI-runs/billing updates. We record each event id in `webhook_events`
 * (service-role only) and treat a unique-violation as "already processed".
 *
 * Fails OPEN (returns false → "process it") on any non-duplicate storage error
 * so a transient DB hiccup never silently drops a real webhook.
 */
export async function alreadyProcessed(
  supabase: SupabaseClient,
  id: string,
  provider: "stripe" | "twilio",
  eventType?: string | null,
): Promise<boolean> {
  if (!id) return false;
  try {
    const { error } = await supabase
      .from("webhook_events")
      .insert({ id: `${provider}:${id}`, provider, event_type: eventType ?? null });
    if (!error) return false; // first time we've seen it
    if ((error as { code?: string }).code === "23505") return true; // duplicate
    return false; // other error → fail open
  } catch {
    return false;
  }
}
