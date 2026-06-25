"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import {
  assertConversationBelongsToOrg,
  assertLeadBelongsToOrg,
} from "@/lib/auth/organizations";
import { normalizePhoneOrRaw } from "@/lib/phone";
import { canTransition } from "@/lib/leads/status";
import { isLeadStatus } from "@/lib/leads/status";
import { sendOwnerLeadEmail } from "@/lib/email/resend";
import { sendSms } from "@/lib/twilio/client";
import { canSendSms, OPT_OUT_FOOTER } from "@/lib/twilio/optout";
import { recommendedNextStep } from "@/lib/leads/intake";
import { env } from "@/lib/env";
import type { Lead } from "@/types/database";

async function loadOwnedLead(leadId: string): Promise<{
  lead: Lead;
  orgId: string;
  notificationEmail: string | null;
  businessName: string;
}> {
  const ctx = await requireOrg();
  const supabase = await createClient();
  // Explicit ownership assertion (defense-in-depth on top of RLS).
  const lead = (await assertLeadBelongsToOrg(
    leadId,
    ctx.organization.id,
    supabase,
  )) as unknown as Lead;
  return {
    lead,
    orgId: ctx.organization.id,
    notificationEmail: ctx.organization.notification_email,
    businessName: ctx.organization.name,
  };
}

export async function updateLeadStatusAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const status = String(formData.get("status"));
  if (!isLeadStatus(status)) return;

  const { lead } = await loadOwnedLead(leadId);
  if (!canTransition(lead.status, status)) {
    // Silently no-op on an invalid transition; the UI only offers valid ones.
    return;
  }
  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", leadId);
  revalidatePath(`/app/leads/${leadId}`);
  revalidatePath("/app");
}

export async function saveOwnerNotesAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const notes = String(formData.get("notes") ?? "");
  await loadOwnedLead(leadId);
  const supabase = await createClient();
  await supabase.from("leads").update({ owner_notes: notes }).eq("id", leadId);
  revalidatePath(`/app/leads/${leadId}`);
}

export async function sendOwnerEmailAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const { lead, notificationEmail, businessName } = await loadOwnedLead(leadId);
  if (!notificationEmail) return;

  await sendOwnerLeadEmail({
    to: notificationEmail,
    businessName,
    appUrl: env.app.url,
    leadId,
    serviceNeeded: lead.service_needed,
    urgency: lead.urgency,
    customerPhone: lead.customer_phone,
    customerName: lead.customer_name,
    address: lead.address,
    summary: lead.ai_summary ?? "No AI summary available.",
    recommendedNextStep: recommendedNextStep(lead.urgency),
  });
  revalidatePath(`/app/leads/${leadId}`);
}

export async function bookAppointmentAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const { lead, orgId } = await loadOwnedLead(leadId);
  const supabase = await createClient();

  await supabase.from("appointments").insert({
    organization_id: orgId,
    lead_id: leadId,
    scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    status: "requested",
    notes: notes || null,
  });
  // Move the lead to "booked" only if that's a valid transition — never
  // downgrade an already won/lost outcome.
  if (canTransition(lead.status, "booked")) {
    await supabase.from("leads").update({ status: "booked" }).eq("id", leadId);
  }
  revalidatePath(`/app/leads/${leadId}`);
  revalidatePath("/app");
}

export async function sendReplyAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { lead, orgId } = await loadOwnedLead(leadId);
  const supabase = await createClient();

  // T-06: never trust a form-supplied conversation id. Only attach it when it
  // provably belongs to this org; otherwise drop it (the reply still records
  // against the lead) rather than touching another org's conversation.
  let safeConversationId: string | null = null;
  if (conversationId) {
    try {
      await assertConversationBelongsToOrg(conversationId, orgId, supabase);
      safeConversationId = conversationId;
    } catch {
      safeConversationId = null;
    }
  }

  const guard = canSendSms(lead);
  let status = "stored";
  let sid: string | undefined;

  // Try to actually deliver over SMS when possible & permitted.
  if (guard.allowed && lead.customer_phone) {
    const result = await sendSms({
      to: normalizePhoneOrRaw(lead.customer_phone) ?? lead.customer_phone,
      body: `${body}\n\n${OPT_OUT_FOOTER}`,
    });
    status = result.sent ? "sent" : result.simulated ? "simulated" : "failed";
    sid = result.sid;
  } else {
    status = guard.reason === "lead_opted_out" ? "blocked_opt_out" : "stored";
  }

  await supabase.from("messages").insert({
    organization_id: orgId,
    conversation_id: safeConversationId,
    lead_id: leadId,
    direction: "outbound",
    channel: "sms",
    to_number: lead.customer_phone,
    body,
    ai_generated: false,
    status,
    provider_message_id: sid ?? null,
  });

  // Mark the lead contacted on the owner's first manual reply.
  if (lead.status === "new") {
    await supabase.from("leads").update({ status: "contacted" }).eq("id", leadId);
  }
  revalidatePath(`/app/leads/${leadId}`);
}
