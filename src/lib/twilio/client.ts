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
    // Ask Twilio to POST delivery updates so message status advances past
    // "sent" (T-04). Without this the status-callback route never fires.
    const statusCallback = env.app.url
      ? `${env.app.url}/api/twilio/sms/status`
      : undefined;
    const message = await client.messages.create({
      to: params.to,
      body: params.body,
      ...(statusCallback ? { statusCallback } : {}),
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
 * Build the candidate URLs Twilio may have signed. Twilio signs the EXACT public
 * URL it called; reconstructing it solely from NEXT_PUBLIC_APP_URL is brittle and
 * 403s every webhook on any host/scheme/proxy mismatch. We try the proxied
 * request URL first, then the raw request URL, then the configured app URL.
 */
export function webhookCandidateUrls(
  req: { headers: Headers; url: string },
  path: string,
): string[] {
  const urls = new Set<string>();
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) urls.add(`${proto ?? "https"}://${host}${path}`);
  try {
    const u = new URL(req.url);
    urls.add(`${u.origin}${u.pathname}`);
  } catch {
    // req.url not absolute — ignore.
  }
  if (env.app.url) urls.add(`${env.app.url}${path}`);
  return Array.from(urls);
}

/**
 * Validate an inbound Twilio webhook signature against one or more candidate
 * URLs (see {@link webhookCandidateUrls}). Returns true when any candidate
 * validates, or when validation is disabled (local dev) / Twilio not configured.
 */
export async function validateTwilioSignature(
  signature: string | null,
  url: string | string[],
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
  const candidates = Array.isArray(url) ? url : [url];
  try {
    const twilio = await import("twilio");
    return candidates.some((candidate) =>
      twilio.validateRequest(
        env.twilio.authToken!,
        signature,
        candidate,
        params,
      ),
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
