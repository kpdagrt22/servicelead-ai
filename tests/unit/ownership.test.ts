import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertLeadBelongsToOrg,
  assertServiceCategoryBelongsToOrg,
  assertConversationBelongsToOrg,
  NotFoundError,
} from "@/lib/auth/organizations";
import { FakeSupabase } from "./fake-supabase";

function db() {
  return new FakeSupabase({
    leads: [
      { id: "lead_a", organization_id: "org1", customer_phone: "+1" },
      { id: "lead_b", organization_id: "org2", customer_phone: "+2" },
    ],
    service_categories: [
      { id: "cat_a", organization_id: "org1", name: "Plumbing" },
    ],
    conversations: [
      { id: "conv_a", organization_id: "org1", lead_id: "lead_a" },
    ],
  }) as unknown as SupabaseClient;
}

describe("ownership assertions", () => {
  it("returns the row when it belongs to the org", async () => {
    const lead = await assertLeadBelongsToOrg("lead_a", "org1", db());
    expect(lead.id).toBe("lead_a");
    const cat = await assertServiceCategoryBelongsToOrg("cat_a", "org1", db());
    expect(cat.id).toBe("cat_a");
    const conv = await assertConversationBelongsToOrg("conv_a", "org1", db());
    expect(conv.id).toBe("conv_a");
  });

  it("throws when the resource belongs to a different org", async () => {
    await expect(
      assertLeadBelongsToOrg("lead_b", "org1", db()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws when the resource does not exist", async () => {
    await expect(
      assertLeadBelongsToOrg("missing", "org1", db()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("prevents cross-org access even with a valid id", async () => {
    // lead_a is org1; asking as org2 must fail.
    await expect(
      assertLeadBelongsToOrg("lead_a", "org2", db()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
