import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, isSupabaseConfigured } from "@/lib/env";
import { processIntake } from "@/lib/leads/intake";
import {
  validateTwilioSignature,
  webhookCandidateUrls,
} from "@/lib/twilio/client";
import { resolveOrgForInboundNumber } from "@/lib/twilio/routing";
import { alreadyProcessed } from "@/lib/webhooks/idempotency";
import { normalizePhoneOrRaw } from "@/lib/phone";

export const dynamic = "force-dynamic";

const PATH = "/api/twilio/voice/missed-call-placeholder";

/**
 * Missed-call placeholder webhook.
 *
 * v1 does NOT build a full voice receptionist. The recommended setup is to
 * forward unanswered calls to voicemail and configure this URL as the voice
 * "no-answer"/status callback, OR to use a Studio Flow that hits this endpoint
 * when a call goes unanswered.
 *
 * When invoked with the caller's number, we kick off SMS-based recovery exactly
 * like a missed call: create the lead and send the first AI outreach text.
 *
 * The TwiML returned simply plays a short message and hangs up (no live AI
 * conversation). See docs/TWILIO_SETUP.md.
 */
export async function POST(req: NextRequest) {
  const sayXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Sorry we missed your call. We've just sent you a text message so we can help you right away.</Say></Response>`;

  if (!isSupabaseConfigured()) {
    return new NextResponse(sayXml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const form = await req.formData().catch(() => null);
  const params: Record<string, string> = {};
  form?.forEach((v, k) => (params[k] = String(v)));

  // Verify the request really came from Twilio before touching the
  // RLS-bypassing service-role client. Fails closed when unverifiable.
  const valid = await validateTwilioSignature(
    req.headers.get("x-twilio-signature"),
    webhookCandidateUrls(req, PATH),
    params,
  );
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = normalizePhoneOrRaw(params.From);
  const to = normalizePhoneOrRaw(params.To);
  const callSid = params.CallSid || "";

  if (from) {
    try {
      const supabase = createAdminClient();

      // Idempotency: a Twilio retry of the same call must not re-trigger
      // recovery (T-07).
      if (
        callSid &&
        (await alreadyProcessed(supabase, callSid, "twilio", "voice.missed_call"))
      ) {
        return new NextResponse(sayXml, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      const organizationId = await resolveOrgForInboundNumber(supabase, to);
      if (organizationId) {
        const result = await processIntake(supabase, {
          organizationId,
          source: "missed_call",
          channel: "sms",
          customer: { phone: from },
          inboundBody: null, // bare missed call → AI sends first outreach
          consent: { status: "missed_call", source: "twilio_voice" },
          providerMessageId: callSid || null,
        });
        // Send the first recovery SMS out-of-band (statusCallback attached).
        if (result.outboundMessage) {
          const { sendSms } = await import("@/lib/twilio/client");
          const sent = await sendSms({ to: from, body: result.outboundMessage });
          if (!sent.sent && !sent.simulated) {
            console.error("[twilio/voice] first recovery SMS failed", sent.error);
          }
        }
      } else {
        console.warn(`[twilio/voice] No org mapped for inbound number ${to}`);
      }
    } catch (err) {
      console.error("[twilio/voice] missed-call handling failed", env.app.url, err);
    }
  }

  return new NextResponse(sayXml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "Missed-call placeholder. Configure as a Twilio voice webhook. POST only for real events.",
  });
}
