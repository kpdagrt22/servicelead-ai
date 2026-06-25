import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { processIntake } from "@/lib/leads/intake";
import {
  twiml,
  validateTwilioSignature,
  webhookCandidateUrls,
} from "@/lib/twilio/client";
import { rateLimitDb } from "@/lib/rate-limit";
import {
  isWebhookProcessed,
  markWebhookProcessed,
} from "@/lib/webhooks/idempotency";
import { resolveOrgForInboundNumber } from "@/lib/twilio/routing";
import { normalizePhoneOrRaw } from "@/lib/phone";

export const dynamic = "force-dynamic";

const PATH = "/api/twilio/sms/inbound";

/**
 * Inbound SMS webhook. Twilio POSTs form-encoded params here when a customer
 * texts your number. We validate the signature, route to the right org by the
 * receiving number, run intake (which handles STOP/opt-out), and reply via
 * TwiML.
 */
export async function POST(req: NextRequest) {
  const xml = (msg?: string) =>
    new NextResponse(twiml(msg), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  if (!isSupabaseConfigured()) return xml();

  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  // Validate signature against the URL Twilio actually called (T-03).
  const signature = req.headers.get("x-twilio-signature");
  const valid = await validateTwilioSignature(
    signature,
    webhookCandidateUrls(req, PATH),
    params,
  );
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = normalizePhoneOrRaw(params.From);
  const to = normalizePhoneOrRaw(params.To);
  const body = params.Body ?? "";
  const messageSid = params.MessageSid || params.SmsSid || "";
  if (!from) return xml();

  const supabase = createAdminClient();

  // Durable, multi-instance flood guard (T-09). This runs BEFORE any idempotency
  // record so a throttled message is never marked "processed" — its Twilio
  // retry can still be handled once the window clears.
  if (!(await rateLimitDb(supabase, `sms:${from}`, 12, 60_000)).allowed) {
    return xml();
  }

  // Route to the org that owns the receiving number; crash-safe (T-01).
  const organizationId = await resolveOrgForInboundNumber(supabase, to);
  if (!organizationId) {
    console.warn(`[twilio] No org mapped for inbound number ${to}`);
    return xml();
  }

  // Idempotency CHECK only (T-07). We mark as processed AFTER success below, so a
  // timed-out first attempt is reprocessed on retry rather than dropped.
  if (await isWebhookProcessed(supabase, messageSid, "twilio")) {
    return xml();
  }

  try {
    const result = await processIntake(supabase, {
      organizationId,
      source: "sms",
      channel: "sms",
      customer: { phone: from },
      inboundBody: body,
      consent: { status: "sms_reply", source: "twilio_inbound" },
      providerMessageId: messageSid || null,
    });

    await markWebhookProcessed(supabase, messageSid, "twilio", "sms.inbound");
    if (result.outboundMessage) return xml(result.outboundMessage);
    return xml();
  } catch (err) {
    console.error("[twilio/inbound] failed", err);
    return xml();
  }
}
