import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, isSupabaseConfigured } from "@/lib/env";
import { processIntake } from "@/lib/leads/intake";
import { twiml, validateTwilioSignature } from "@/lib/twilio/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

  // Validate signature against the configured public URL.
  const url = `${env.app.url}/api/twilio/sms/inbound`;
  const signature = req.headers.get("x-twilio-signature");
  const valid = await validateTwilioSignature(signature, url, params);
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From;
  const to = params.To;
  const body = params.Body ?? "";
  if (!from) return xml();

  // Basic safety guard against a flood from one number.
  if (!rateLimit(`sms:${from}`, 12, 60_000).allowed) return xml();

  const supabase = createAdminClient();

  // Route to the org that owns the receiving number; fall back to env number.
  let organizationId: string | undefined;
  const { data: numberRow } = await supabase
    .from("twilio_numbers")
    .select("organization_id")
    .eq("phone_number", to)
    .maybeSingle();
  organizationId = numberRow?.organization_id as string | undefined;

  if (!organizationId) {
    // Single-tenant fallback: if exactly one org exists, use it.
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .limit(2);
    if (orgs && orgs.length === 1) organizationId = orgs[0].id as string;
  }

  if (!organizationId) {
    console.warn(`[twilio] No org mapped for inbound number ${to}`);
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
    });

    // Reply with the AI's next message (or opt-out/opt-in confirmation).
    if (result.outboundMessage) return xml(result.outboundMessage);
    return xml();
  } catch (err) {
    console.error("[twilio/inbound] failed", err);
    return xml();
  }
}
