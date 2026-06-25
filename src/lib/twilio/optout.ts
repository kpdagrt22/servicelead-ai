import { START_KEYWORDS, STOP_KEYWORDS } from "@/lib/constants";

/**
 * SMS opt-out (STOP) and opt-in (START) keyword detection.
 *
 * Compliance: carriers and TCPA require honoring STOP/UNSUBSCRIBE/CANCEL/QUIT.
 * We detect these on the FIRST word of an inbound message (the standard carrier
 * behavior) so an unrelated message that merely contains the word "stop" mid
 * sentence does not accidentally opt a customer out.
 */

export type OptOutAction = "opt_out" | "opt_in" | "none";

function firstWord(body: string): string {
  return body
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)[0]
    ?.trim() ?? "";
}

export function detectOptOutAction(body: string): OptOutAction {
  const word = firstWord(body);
  if (!word) return "none";
  // STOP variants are honored as the first word (carrier standard), so
  // "STOP please" still opts out.
  if (STOP_KEYWORDS.includes(word)) return "opt_out";
  // Opt-in keywords must be the SOLE content of the message so a normal reply
  // (e.g. "start over with a new quote") is not misread as a re-subscribe.
  const normalized = body
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (START_KEYWORDS.includes(normalized)) return "opt_in";
  return "none";
}

export function isStopMessage(body: string): boolean {
  return detectOptOutAction(body) === "opt_out";
}

export function isStartMessage(body: string): boolean {
  return detectOptOutAction(body) === "opt_in";
}

/**
 * Whether we are permitted to send an outbound SMS to this lead. We never
 * message an opted-out number. Returns a reason for logging when blocked.
 */
export function canSendSms(lead: {
  opt_out?: boolean | null;
  customer_phone?: string | null;
}): { allowed: boolean; reason?: string } {
  if (lead.opt_out) return { allowed: false, reason: "lead_opted_out" };
  if (!lead.customer_phone) return { allowed: false, reason: "no_phone" };
  return { allowed: true };
}

export const STOP_CONFIRMATION =
  "You're unsubscribed and won't receive more messages from us. Reply START to resume.";

export const START_CONFIRMATION =
  "You're resubscribed. Reply STOP at any time to unsubscribe.";

/** Appended to the first outbound message of a conversation for compliance. */
export const OPT_OUT_FOOTER = "Reply STOP to opt out.";
