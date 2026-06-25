import { env, isTwilioConfigured } from "@/lib/env";

/**
 * Twilio SMS abstraction. Entirely optional: when env vars are missing, sends
 * are "simulated" (logged) and the app keeps working via the in-app simulator.
 * The `twilio` package is an optional dependency, imported lazily.
 */

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

export interface SendSmsResult {
  sent: boolean;
  simulated: boolean;
  sid?: string;
  error?: string;
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  if (!isTwilioConfigured()) {
    console.info(`[twilio:simulated] -> ${params.to}: ${params.body}`);
    return { sent: false, simulated: true };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(env.twilio.accountSid, env.twilio.authToken);
    const message = await client.messages.create({
      to: params.to,
      body: params.body,
      ...(env.twilio.messagingServiceSid
        ? { messagingServiceSid: env.twilio.messagingServiceSid }
        : { from: params.from ?? env.twilio.phoneNumber }),
    });
    return { sent: true, simulated: false, sid: message.sid };
  } catch (err) {
    console.error("[twilio] send failed", err);
    return {
      sent: false,
      simulated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Validate an inbound Twilio webhook signature. Returns true when valid, or
 * when validation is disabled (local dev) / Twilio not configured.
 */
export async function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  // Allow skipping validation ONLY outside production (local dev / tunnels).
  if (!env.twilio.validateSignature && process.env.NODE_ENV !== "production") {
    return true;
  }
  // Fail CLOSED: with no auth token we cannot prove the request came from
  // Twilio, so reject it rather than exposing the service-role client.
  if (!env.twilio.authToken) return false;
  if (!signature) return false;
  try {
    const twilio = await import("twilio");
    return twilio.validateRequest(
      env.twilio.authToken,
      signature,
      url,
      params,
    );
  } catch (err) {
    console.error("[twilio] signature validation error", err);
    return false;
  }
}

/** Minimal TwiML message response (used by inbound webhooks). */
export function twiml(message?: string): string {
  const body = message
    ? `<Message>${escapeXml(message)}</Message>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
