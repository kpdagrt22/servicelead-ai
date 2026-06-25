import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { processIntake } from "@/lib/leads/intake";
import { publicIntakeSchema } from "@/lib/validation/schemas";
import { rateLimitDb } from "@/lib/rate-limit";
import type { ExtractedFields } from "@/lib/ai/schemas/lead-intake";

export const dynamic = "force-dynamic";

/**
 * Public intake endpoint. Powers the customer-facing form at /u/[slug]. Uses
 * the service-role client (no user session) and is protected by a basic IP
 * rate limit. Always responds to inbound, customer-initiated requests only.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Service not configured." },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Durable, multi-instance per-IP guard (T-09).
  const limit = await rateLimitDb(supabase, `intake:ip:${ip}`, 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again shortly." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = publicIntakeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Resolve the organization by id or slug.
  let orgId = input.organizationId;
  if (!orgId && input.slug) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle();
    orgId = org?.id;
  }
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "Business not found." },
      { status: 404 },
    );
  }

  // Per-org cap so one business can't be flooded from many IPs (T-09).
  const orgLimit = await rateLimitDb(supabase, `intake:org:${orgId}`, 60, 60_000);
  if (!orgLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again shortly." },
      { status: 429 },
    );
  }

  const knownFields: ExtractedFields = {
    service_needed: input.serviceNeeded,
    urgency: input.urgency ?? null,
    address: input.address || null,
    preferred_time: input.preferredTime || null,
    customer_name: input.customerName || null,
    customer_email: input.customerEmail || null,
    notes: input.details,
  };

  try {
    const result = await processIntake(supabase, {
      organizationId: orgId,
      source: "web_form",
      channel: "web",
      customer: {
        name: input.customerName || null,
        phone: input.customerPhone,
        email: input.customerEmail || null,
      },
      inboundBody: input.details,
      knownFields,
      consent: { status: "form_consent", source: "web_form" },
    });

    return NextResponse.json({
      ok: true,
      leadId: result.leadId,
      message:
        result.outboundMessage ??
        "Thanks! We've received your request and will follow up shortly.",
    });
  } catch (err) {
    console.error("[api/intake] failed", err);
    return NextResponse.json(
      { ok: false, error: "Could not submit your request. Please try again." },
      { status: 500 },
    );
  }
}
