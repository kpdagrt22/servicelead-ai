import type { SupabaseClient } from "@supabase/supabase-js";
import { runLeadIntake } from "@/lib/ai/service";
import type {
  ExtractedFields,
  IntakeContext,
  LeadIntakeResult,
} from "@/lib/ai/schemas/lead-intake";
import {
  detectOptOutAction,
  OPT_OUT_FOOTER,
  START_CONFIRMATION,
  STOP_CONFIRMATION,
} from "@/lib/twilio/optout";
import { sendOwnerLeadEmail } from "@/lib/email/resend";
import { normalizePhoneOrRaw } from "@/lib/phone";
import { env } from "@/lib/env";
import type {
  Channel,
  IntakeQuestion,
  LeadSource,
  Organization,
} from "@/types/database";

/**
 * The core intake pipeline shared by every entry point: the public web form,
 * the in-app simulator, and the Twilio SMS webhook.
 *
 *   inbound message → find/create lead + conversation → opt-out check →
 *   AI intake → persist fields/summary/score → log → notify owner
 *
 * Pass a Supabase client: the service-role/admin client for webhooks & the
 * public form, or a user-scoped server client for in-app actions.
 */

export interface ProcessIntakeInput {
  organizationId: string;
  source: LeadSource;
  channel: Channel;
  customer: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  inboundBody?: string | null;
  knownFields?: ExtractedFields;
  consent?: { status: string; source: string };
  /** Provider message id (e.g. Twilio MessageSid) for the inbound message. */
  providerMessageId?: string | null;
}

/** Append the opt-out footer to an outbound SMS unless it already has one. */
function ensureOptOutFooter(body: string): string {
  return /reply stop/i.test(body) ? body : `${body}\n\n${OPT_OUT_FOOTER}`;
}

export interface ProcessIntakeResult {
  leadId: string;
  conversationId: string;
  aiResult: LeadIntakeResult | null;
  outboundMessage: string | null;
  ownerNotified: boolean;
  optedOut: boolean;
  optedIn: boolean;
}

export function recommendedNextStep(urgency: string | null): string {
  switch (urgency) {
    case "emergency":
      return "Call this customer back immediately.";
    case "high":
      return "Call or text within the next hour.";
    case "medium":
      return "Follow up today to confirm details and schedule.";
    default:
      return "Follow up within 24 hours to qualify and book.";
  }
}

async function loadOrgIntakeData(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{
  org: Organization;
  categoryNames: string[];
  questions: IntakeQuestion[];
}> {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();
  if (error || !org) throw new Error(`Organization not found: ${organizationId}`);

  const { data: categories } = await supabase
    .from("service_categories")
    .select("name")
    .eq("organization_id", organizationId)
    .eq("active", true);

  const { data: templates } = await supabase
    .from("intake_templates")
    .select("questions")
    .eq("organization_id", organizationId)
    .eq("active", true);

  // Merge & de-dupe questions across active templates by key.
  const byKey = new Map<string, IntakeQuestion>();
  for (const t of templates ?? []) {
    for (const q of (t.questions as IntakeQuestion[]) ?? []) {
      if (q?.key && !byKey.has(q.key)) byKey.set(q.key, q);
    }
  }

  return {
    org: org as Organization,
    categoryNames: (categories ?? []).map((c) => c.name as string),
    questions: Array.from(byKey.values()),
  };
}

/**
 * Opt-out is authoritative per contact (phone/email) within an organization, not
 * per individual lead row. If a customer ever texted STOP, ANY lead for that
 * phone/email — current or future, on any channel — must be treated as
 * opted-out. This prevents a new web-form/SMS lead from "resurrecting" messaging
 * to someone who unsubscribed.
 */
async function findOrgOptOut(
  supabase: SupabaseClient,
  organizationId: string,
  phone?: string | null,
  email?: string | null,
): Promise<boolean> {
  if (phone) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("customer_phone", phone)
      .eq("opt_out", true)
      .limit(1);
    if (data && data.length > 0) return true;
  }
  if (email) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("customer_email", email)
      .eq("opt_out", true)
      .limit(1);
    if (data && data.length > 0) return true;
  }
  return false;
}

async function findOrCreateLead(
  supabase: SupabaseClient,
  input: ProcessIntakeInput,
): Promise<{ leadId: string; conversationId: string; existingOptOut: boolean }> {
  const { organizationId, source, channel, customer, knownFields, consent } =
    input;
  const contactEmail = customer.email ?? knownFields?.customer_email ?? null;

  // For phone-based channels, reuse an existing lead so the conversation
  // continues instead of duplicating. Web-form submissions always create new.
  let lead:
    | { id: string; opt_out: boolean }
    | null = null;

  if (customer.phone && (source === "sms" || source === "missed_call")) {
    const { data } = await supabase
      .from("leads")
      .select("id, opt_out")
      .eq("organization_id", organizationId)
      .eq("customer_phone", customer.phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = data as { id: string; opt_out: boolean } | null;
  }

  // Check org-level opt-out (by phone/email) so a freshly created lead for a
  // previously unsubscribed contact starts opted-out and is never messaged.
  const priorOptOut = await findOrgOptOut(
    supabase,
    organizationId,
    customer.phone,
    contactEmail,
  );

  if (!lead) {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        source,
        customer_name: customer.name ?? knownFields?.customer_name ?? null,
        customer_phone: customer.phone ?? null,
        customer_email: contactEmail,
        service_needed: knownFields?.service_needed ?? null,
        urgency: knownFields?.urgency ?? null,
        address: knownFields?.address ?? null,
        preferred_time: knownFields?.preferred_time ?? null,
        status: "new",
        opt_out: priorOptOut,
        consent_status: priorOptOut ? "opted_out" : (consent?.status ?? null),
        consent_source: consent?.source ?? null,
      })
      .select("id, opt_out")
      .single();
    if (error || !data) throw new Error(`Failed to create lead: ${error?.message}`);
    lead = data as { id: string; opt_out: boolean };
  } else if (priorOptOut && !lead.opt_out) {
    // Existing row predates an opt-out on a sibling row — sync it.
    await supabase.from("leads").update({ opt_out: true }).eq("id", lead.id);
    lead.opt_out = true;
  }

  // Find or create an open conversation for this lead/channel.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", lead.id)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId = conv?.id as string | undefined;
  if (!conversationId) {
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        organization_id: organizationId,
        lead_id: lead.id,
        channel,
        status: "open",
      })
      .select("id")
      .single();
    if (error || !newConv)
      throw new Error(`Failed to create conversation: ${error?.message}`);
    conversationId = newConv.id as string;
  }

  return { leadId: lead.id, conversationId, existingOptOut: lead.opt_out };
}

async function insertMessage(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    conversationId: string;
    leadId: string;
    direction: "inbound" | "outbound";
    channel: Channel;
    body: string;
    fromNumber?: string | null;
    toNumber?: string | null;
    aiGenerated?: boolean;
    status?: string;
    providerMessageId?: string | null;
  },
): Promise<void> {
  await supabase.from("messages").insert({
    organization_id: params.organizationId,
    conversation_id: params.conversationId,
    lead_id: params.leadId,
    direction: params.direction,
    channel: params.channel,
    from_number: params.fromNumber ?? null,
    to_number: params.toNumber ?? null,
    body: params.body,
    ai_generated: params.aiGenerated ?? false,
    status: params.status ?? "stored",
    provider_message_id: params.providerMessageId ?? null,
  });
}

export async function processIntake(
  supabase: SupabaseClient,
  input: ProcessIntakeInput,
): Promise<ProcessIntakeResult> {
  // Normalize the contact phone ONCE at the boundary so find-or-create,
  // opt-out matching, and message routing all use the same canonical form
  // (T-02). Every downstream read of input.customer.phone is now canonical.
  input = {
    ...input,
    customer: {
      ...input.customer,
      phone: normalizePhoneOrRaw(input.customer.phone),
    },
  };

  const { org, categoryNames, questions } = await loadOrgIntakeData(
    supabase,
    input.organizationId,
  );

  const { leadId, conversationId, existingOptOut } = await findOrCreateLead(
    supabase,
    input,
  );

  // ── Opt-out / opt-in handling (highest priority) ──────────────────────────
  if (input.inboundBody) {
    const action = detectOptOutAction(input.inboundBody);

    // Always record the inbound message (with the provider id for delivery
    // reconciliation + dedupe).
    await insertMessage(supabase, {
      organizationId: input.organizationId,
      conversationId,
      leadId,
      direction: "inbound",
      channel: input.channel,
      body: input.inboundBody,
      fromNumber: input.customer.phone ?? null,
      providerMessageId: input.providerMessageId ?? null,
      status: "received",
    });

    if (action === "opt_out") {
      // Opt out EVERY lead for this phone in the org, not just the current row,
      // so no sibling/future lead remains messageable.
      const optOutQuery = supabase
        .from("leads")
        .update({ opt_out: true, consent_status: "opted_out" });
      if (input.customer.phone) {
        await optOutQuery
          .eq("organization_id", input.organizationId)
          .eq("customer_phone", input.customer.phone);
      } else {
        await optOutQuery.eq("id", leadId);
      }
      await insertMessage(supabase, {
        organizationId: input.organizationId,
        conversationId,
        leadId,
        direction: "outbound",
        channel: input.channel,
        body: STOP_CONFIRMATION,
        status: "queued",
      });
      return {
        leadId,
        conversationId,
        aiResult: null,
        outboundMessage: STOP_CONFIRMATION,
        ownerNotified: false,
        optedOut: true,
        optedIn: false,
      };
    }

    if (action === "opt_in") {
      // Re-subscribe every lead for this phone, mirroring the opt-out scope.
      const optInQuery = supabase
        .from("leads")
        .update({ opt_out: false, consent_status: "opted_in" });
      if (input.customer.phone) {
        await optInQuery
          .eq("organization_id", input.organizationId)
          .eq("customer_phone", input.customer.phone);
      } else {
        await optInQuery.eq("id", leadId);
      }
      return {
        leadId,
        conversationId,
        aiResult: null,
        outboundMessage: START_CONFIRMATION,
        ownerNotified: false,
        optedOut: false,
        optedIn: true,
      };
    }
  }

  // Never continue messaging an opted-out lead.
  if (existingOptOut) {
    return {
      leadId,
      conversationId,
      aiResult: null,
      outboundMessage: null,
      ownerNotified: false,
      optedOut: true,
      optedIn: false,
    };
  }

  // ── Build AI context from the full conversation ───────────────────────────
  const { data: history } = await supabase
    .from("messages")
    .select("direction, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const context: IntakeContext = {
    businessName: org.name,
    businessType: org.business_type ?? undefined,
    serviceCategories: categoryNames,
    intakeQuestions: questions,
    emergencyService: org.emergency_service,
    messages: (history ?? []).map((m) => ({
      direction: m.direction as "inbound" | "outbound",
      body: m.body as string,
    })),
    knownFields: input.knownFields ?? {},
  };

  // ── Run AI intake ─────────────────────────────────────────────────────────
  const run = await runLeadIntake(context);
  const ai = run.result;
  const f = ai.extracted_fields;

  // ── Persist extracted fields (only fill blanks) + score + summary ─────────
  const { data: current } = await supabase
    .from("leads")
    .select(
      "customer_name, customer_email, service_needed, urgency, address, city, state, postal_code, preferred_time",
    )
    .eq("id", leadId)
    .single();

  const patch: Record<string, unknown> = {
    lead_score: ai.lead_score,
    ai_summary: ai.owner_summary,
  };
  const fillIfEmpty = (col: string, value: string | null | undefined) => {
    if (value && !(current as Record<string, unknown>)?.[col]) patch[col] = value;
  };
  fillIfEmpty("customer_name", f.customer_name ?? input.customer.name);
  fillIfEmpty("customer_email", f.customer_email ?? input.customer.email);
  fillIfEmpty("service_needed", f.service_needed);
  fillIfEmpty("urgency", f.urgency);
  fillIfEmpty("address", f.address);
  fillIfEmpty("city", f.city);
  fillIfEmpty("state", f.state);
  fillIfEmpty("postal_code", f.postal_code);
  fillIfEmpty("preferred_time", f.preferred_time);

  await supabase.from("leads").update(patch).eq("id", leadId);

  // ── Store the AI's outbound reply (sending handled by the caller) ─────────
  // For SMS we (a) append the opt-out footer for compliance and (b) record it
  // as "sent" because the caller returns it as the TwiML reply that Twilio
  // delivers immediately (it is no longer perpetually "queued").
  const isSms = input.channel === "sms";
  const outboundBody = ai.next_message_to_customer
    ? isSms
      ? ensureOptOutFooter(ai.next_message_to_customer)
      : ai.next_message_to_customer
    : null;
  if (outboundBody) {
    await insertMessage(supabase, {
      organizationId: input.organizationId,
      conversationId,
      leadId,
      direction: "outbound",
      channel: input.channel,
      body: outboundBody,
      toNumber: input.customer.phone ?? null,
      aiGenerated: true,
      status: isSms ? "sent" : "stored",
    });
  }

  // ── Log the AI run ────────────────────────────────────────────────────────
  await supabase.from("ai_intake_logs").insert({
    organization_id: input.organizationId,
    lead_id: leadId,
    conversation_id: conversationId,
    provider: run.provider,
    model: run.model,
    input_json: context,
    output_json: ai,
    status: run.usedFallback ? "fallback" : "ok",
    error_message: run.error ?? null,
  });

  // ── Notify the owner ──────────────────────────────────────────────────────
  let ownerNotified = false;
  if (ai.should_notify_owner && org.notification_email) {
    const res = await sendOwnerLeadEmail({
      to: org.notification_email,
      businessName: org.name,
      appUrl: env.app.url,
      leadId,
      serviceNeeded: patch.service_needed as string ?? f.service_needed ?? null,
      urgency: (patch.urgency as string) ?? f.urgency ?? null,
      customerPhone: input.customer.phone ?? null,
      customerName: (patch.customer_name as string) ?? f.customer_name ?? null,
      address: (patch.address as string) ?? f.address ?? null,
      summary: ai.owner_summary,
      recommendedNextStep: recommendedNextStep(f.urgency ?? null),
      riskFlags: ai.risk_flags,
    });
    ownerNotified = res.delivered;
  }

  return {
    leadId,
    conversationId,
    aiResult: ai,
    outboundMessage: outboundBody,
    ownerNotified,
    optedOut: false,
    optedIn: false,
  };
}
