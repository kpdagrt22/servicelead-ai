import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FakeSupabase } from "./fake-supabase";
import { resolveOrgForInboundNumber } from "@/lib/twilio/routing";

function db(seed: Record<string, Record<string, unknown>[]>): SupabaseClient {
  return new FakeSupabase(seed) as unknown as SupabaseClient;
}

describe("resolveOrgForInboundNumber (T-01)", () => {
  it("routes to the org that owns the number, format-insensitive", async () => {
    const sb = db({
      organizations: [{ id: "org_a" }, { id: "org_b" }],
      twilio_numbers: [
        { organization_id: "org_a", phone_number: "+15551112222" },
      ],
    });
    expect(await resolveOrgForInboundNumber(sb, "555-111-2222")).toBe("org_a");
    expect(await resolveOrgForInboundNumber(sb, "+15551112222")).toBe("org_a");
  });

  it("falls back to the only org when unmapped AND single-tenant", async () => {
    const sb = db({ organizations: [{ id: "solo" }], twilio_numbers: [] });
    expect(await resolveOrgForInboundNumber(sb, "+15550000000")).toBe("solo");
  });

  it("does NOT fall back when unmapped AND multi-tenant (no misrouting)", async () => {
    const sb = db({
      organizations: [{ id: "a" }, { id: "b" }],
      twilio_numbers: [],
    });
    expect(await resolveOrgForInboundNumber(sb, "+15550000000")).toBeUndefined();
  });

  it("returns undefined when there are no orgs at all", async () => {
    const sb = db({ organizations: [], twilio_numbers: [] });
    expect(await resolveOrgForInboundNumber(sb, "+15550000000")).toBeUndefined();
  });
});
