"use server";

import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { processIntake } from "@/lib/leads/intake";
import { simulatorSchema } from "@/lib/validation/schemas";
import type { Channel, LeadSource } from "@/types/database";

/**
 * Use the service-role client when available (so ai_intake_logs can be written
 * under RLS); otherwise fall back to the user-scoped client.
 */
function getWriteClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function runSimulationAction(formData: FormData) {
  const ctx = await requireOrg();
  if (!isSupabaseConfigured()) return;

  const parsed = simulatorSchema.safeParse({
    scenario: formData.get("scenario"),
    customerName: formData.get("customerName") ?? "",
    customerPhone: formData.get("customerPhone"),
    service: formData.get("service") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return;

  const { scenario, customerName, customerPhone, service, message } =
    parsed.data;

  const sourceMap: Record<string, LeadSource> = {
    missed_call: "missed_call",
    sms: "sms",
    web_form: "web_form",
  };
  const channelMap: Record<string, Channel> = {
    missed_call: "sms",
    sms: "sms",
    web_form: "web",
  };

  const admin = getWriteClient();
  const supabase = admin ?? (await createClient());

  const result = await processIntake(supabase, {
    organizationId: ctx.organization.id,
    source: sourceMap[scenario],
    channel: channelMap[scenario],
    customer: {
      name: customerName || null,
      phone: customerPhone,
    },
    // A bare missed call has no message yet; SMS/web include the text.
    inboundBody: scenario === "missed_call" ? null : message || null,
    knownFields: service ? { service_needed: service } : undefined,
    consent: { status: "inbound_initiated", source: `simulator:${scenario}` },
  });

  redirect(`/app/leads/${result.leadId}`);
}
