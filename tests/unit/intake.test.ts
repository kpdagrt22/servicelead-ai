import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processIntake } from "@/lib/leads/intake";
import { FakeSupabase } from "./fake-supabase";

/**
 * Integration tests for the core intake orchestration (processIntake) using an
 * in-memory Supabase fake. These lock in the compliance-critical behavior:
 * opt-out is authoritative per phone across leads/channels, and an opted-out
 * contact is never messaged again.
 */

const ORG_ID = "org1";
const PHONE = "+15551230000";

function makeDb() {
  return new FakeSupabase({
    organizations: [
      {
        id: ORG_ID,
        name: "Test Plumbing",
        slug: "test-plumbing",
        business_type: "Plumbing",
        emergency_service: true,
        notification_email: null, // keep tests quiet (no email path)
      },
    ],
    service_categories: [
      { id: "cat1", organization_id: ORG_ID, name: "Plumbing repair", active: true },
    ],
    intake_templates: [
      {
        id: "tmpl1",
        organization_id: ORG_ID,
        service_category_id: "cat1",
        active: true,
        questions: [
          { key: "service_needed", label: "What service?", required: true },
          { key: "urgency", label: "Urgent?", required: true },
          { key: "issue", label: "Describe", required: true },
        ],
      },
    ],
    leads: [],
    conversations: [],
    messages: [],
    ai_intake_logs: [],
  });
}

function client(db: FakeSupabase): SupabaseClient {
  return db as unknown as SupabaseClient;
}

function leadsFor(db: FakeSupabase, phone: string) {
  return db.rows("leads").filter((l) => l.customer_phone === phone);
}
function messagesFor(db: FakeSupabase, leadId: string) {
  return db.rows("messages").filter((m) => m.lead_id === leadId);
}

describe("processIntake — web form", () => {
  let db: FakeSupabase;
  beforeEach(() => (db = makeDb()));

  it("creates a lead, conversation, AI summary, and logs the run", async () => {
    const res = await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "web_form",
      channel: "web",
      customer: { name: "Casey", phone: PHONE, email: "casey@example.com" },
      inboundBody:
        "Water heater burst and is flooding the garage, need help today",
      knownFields: {
        service_needed: "Water heater repair",
        urgency: "emergency",
        address: "142 Oak St",
        notes: "burst, flooding",
      },
      consent: { status: "form_consent", source: "web_form" },
    });

    expect(res.optedOut).toBe(false);
    expect(res.aiResult).not.toBeNull();
    expect(res.aiResult!.lead_score).toBeGreaterThanOrEqual(0);

    const leads = db.rows("leads");
    expect(leads).toHaveLength(1);
    expect(leads[0].ai_summary).toBeTruthy();
    expect(typeof leads[0].lead_score).toBe("number");
    expect(leads[0].opt_out).toBe(false);

    expect(db.rows("conversations")).toHaveLength(1);
    expect(db.rows("ai_intake_logs")).toHaveLength(1);
    expect(db.rows("ai_intake_logs")[0].provider).toBe("mock");
  });
});

describe("processIntake — STOP / opt-out (per phone)", () => {
  let db: FakeSupabase;
  beforeEach(() => (db = makeDb()));

  it("opts out EVERY lead for the phone, not just the latest row", async () => {
    // Two separate web-form leads for the same phone.
    for (const note of ["leak under sink", "second request later"]) {
      await processIntake(client(db), {
        organizationId: ORG_ID,
        source: "web_form",
        channel: "web",
        customer: { phone: PHONE },
        inboundBody: note,
        knownFields: { service_needed: "Plumbing", notes: note },
      });
    }
    expect(leadsFor(db, PHONE).length).toBe(2);
    expect(leadsFor(db, PHONE).every((l) => l.opt_out === false)).toBe(true);

    const logsBeforeStop = db.rows("ai_intake_logs").length;

    // Now an inbound STOP over SMS.
    const res = await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "STOP",
    });

    expect(res.optedOut).toBe(true);
    expect(res.aiResult).toBeNull();
    // BOTH prior leads are now opted out.
    expect(leadsFor(db, PHONE).every((l) => l.opt_out === true)).toBe(true);
    // The STOP message itself triggered NO additional AI run.
    expect(db.rows("ai_intake_logs").length).toBe(logsBeforeStop);
  });

  it("blocks messaging an opted-out contact on a later inbound SMS", async () => {
    await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "my pipe is leaking",
    });
    await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "STOP",
    });

    const lead = leadsFor(db, PHONE)[0];
    const countAiOutbound = () =>
      messagesFor(db, lead.id).filter(
        (m) => m.direction === "outbound" && m.ai_generated === true,
      ).length;
    const aiOutboundBefore = countAiOutbound();

    const res = await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "actually are you there?",
    });

    expect(res.optedOut).toBe(true);
    expect(res.outboundMessage).toBeNull();
    // The post-opt-out inbound produced NO new AI-generated outbound.
    expect(countAiOutbound()).toBe(aiOutboundBefore);
  });

  it("REGRESSION: a web-form submission cannot resurrect an opted-out contact", async () => {
    // Customer texts, then opts out.
    await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "need a plumber",
    });
    await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "STOP",
    });

    // Later, a web-form submission arrives for the SAME phone.
    const res = await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "web_form",
      channel: "web",
      customer: { phone: PHONE, name: "Casey" },
      inboundBody: "Can you give me a quote?",
      knownFields: { service_needed: "Quote", notes: "quote please" },
    });

    expect(res.optedOut).toBe(true);
    expect(res.aiResult).toBeNull();
    // The new web-form lead inherited the opt-out and was never messaged.
    expect(leadsFor(db, PHONE).every((l) => l.opt_out === true)).toBe(true);
    const newest = leadsFor(db, PHONE).slice(-1)[0];
    const outbound = messagesFor(db, newest.id).filter(
      (m) => m.direction === "outbound",
    );
    expect(outbound).toHaveLength(0);
  });

  it("START re-subscribes every lead for the phone", async () => {
    await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "hello",
    });
    await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "STOP",
    });
    expect(leadsFor(db, PHONE).every((l) => l.opt_out === true)).toBe(true);

    const res = await processIntake(client(db), {
      organizationId: ORG_ID,
      source: "sms",
      channel: "sms",
      customer: { phone: PHONE },
      inboundBody: "START",
    });

    expect(res.optedIn).toBe(true);
    expect(leadsFor(db, PHONE).every((l) => l.opt_out === false)).toBe(true);
  });
});
