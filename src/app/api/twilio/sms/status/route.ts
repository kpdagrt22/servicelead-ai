import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, isSupabaseConfigured } from "@/lib/env";
import { validateTwilioSignature } from "@/lib/twilio/client";

export const dynamic = "force-dynamic";

/**
 * Delivery status callback. Twilio POSTs MessageSid + MessageStatus
 * (queued/sent/delivered/failed/undelivered). We update the matching message
 * row so the conversation reflects real delivery state.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return new NextResponse("ok");

  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const url = `${env.app.url}/api/twilio/sms/status`;
  const valid = await validateTwilioSignature(
    req.headers.get("x-twilio-signature"),
    url,
    params,
  );
  if (!valid) return new NextResponse("Invalid signature", { status: 403 });

  const sid = params.MessageSid;
  const status = params.MessageStatus;
  if (sid && status) {
    const supabase = createAdminClient();
    await supabase
      .from("messages")
      .update({ status })
      .eq("provider_message_id", sid);
  }
  return new NextResponse("ok");
}
