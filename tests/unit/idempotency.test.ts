import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabase } from "./fake-supabase";
import {
  isWebhookProcessed,
  markWebhookProcessed,
} from "@/lib/webhooks/idempotency";

function db(): SupabaseClient {
  return new FakeSupabase({ webhook_events: [] }) as unknown as SupabaseClient;
}

describe("webhook idempotency (check-then-mark)", () => {
  it("is not processed until explicitly marked (so a failed attempt reprocesses)", async () => {
    const sb = db();
    expect(await isWebhookProcessed(sb, "SM1", "twilio")).toBe(false);
    await markWebhookProcessed(sb, "SM1", "twilio", "sms.inbound");
    expect(await isWebhookProcessed(sb, "SM1", "twilio")).toBe(true);
  });

  it("scopes the key by provider + id", async () => {
    const sb = db();
    await markWebhookProcessed(sb, "evt_1", "stripe");
    expect(await isWebhookProcessed(sb, "evt_1", "stripe")).toBe(true);
    expect(await isWebhookProcessed(sb, "evt_1", "twilio")).toBe(false);
  });

  it("treats an empty id as not processed and a no-op to mark", async () => {
    const sb = db();
    expect(await isWebhookProcessed(sb, "", "twilio")).toBe(false);
    await markWebhookProcessed(sb, "", "twilio");
    expect(await isWebhookProcessed(sb, "", "twilio")).toBe(false);
  });
});
