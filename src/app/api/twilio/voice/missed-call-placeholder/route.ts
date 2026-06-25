import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, isSupabaseConfigured } from "@/lib/env";
import { processIntake } from "@/lib/leads/intake";
import { validateTwilioSignature } from "@/lib/twilio/client";

export const dynamic = "force-dynamic";

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
    `${env.app.url}/api/twilio/voice/missed-call-placeholder`,
    params,
  );
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From ?? "";
  const to = params.To ?? "";

  if (from) {
    try {
      const supabase = createAdminClient();
      let organizationId: string | undefined;
      const { data: numberRow } = await supabase
        .from("twilio_numbers")
        .select("organization_id")
        .eq("phone_number", to)
        .maybeSingle();
      organizationId = numberRow?.organization_id as string | undefined;

      if (!organizationId) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id")
          .limit(2);
        if (orgs && orgs.length === 1) organizationId = orgs[0].id as string;
      }

      if (organizationId) {
        const result = await processIntake(supabase, {
          organizationId,
          source: "missed_call",
          channel: "sms",
          customer: { phone: from },
          inboundBody: null, // bare missed call → AI sends first outreach
          consent: { status: "missed_call", source: "twilio_voice" },
        });
        // Send the first recovery SMS out-of-band.
        if (result.outboundMessage) {
          const { sendSms } = await import("@/lib/twilio/client");
          await sendSms({ to: from, body: result.outboundMessage });
        }
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
