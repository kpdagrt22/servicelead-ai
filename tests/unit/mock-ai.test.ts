import { describe, expect, it } from "vitest";
import { MockAiProvider } from "@/lib/ai/providers/mock";
import { runLeadIntake } from "@/lib/ai/service";
import type { IntakeContext } from "@/lib/ai/schemas/lead-intake";

const baseContext: IntakeContext = {
  businessName: "Rapid Plumbing",
  businessType: "Plumbing",
  serviceCategories: ["Plumbing repair", "HVAC repair"],
  intakeQuestions: [
    { key: "service_needed", label: "What service?", required: true },
    { key: "urgency", label: "Urgent?", required: true },
    { key: "issue", label: "Describe", required: true },
    { key: "address", label: "Address?", required: false },
  ],
  emergencyService: true,
  messages: [],
  knownFields: {},
};

describe("MockAiProvider", () => {
  const provider = new MockAiProvider();

  it("greets and asks the first question on a bare missed call", async () => {
    const result = await provider.runIntake(baseContext);
    expect(result.next_message_to_customer).toContain("Rapid Plumbing");
    expect(result.next_message_to_customer?.toLowerCase()).toContain("stop");
    expect(result.missing_fields.length).toBeGreaterThan(0);
    expect(result.should_notify_owner).toBe(false);
  });

  it("extracts fields, scores, and writes an owner summary from a rich message", async () => {
    const result = await provider.runIntake({
      ...baseContext,
      messages: [
        {
          direction: "inbound",
          body: "My water heater burst and it's flooding the garage at 142 Oak St, can someone come today? casey@example.com",
        },
      ],
    });
    expect(result.extracted_fields.urgency).toBe("emergency");
    expect(result.extracted_fields.customer_email).toBe("casey@example.com");
    expect(result.extracted_fields.address).toBeTruthy();
    expect(result.lead_score).toBeGreaterThanOrEqual(70);
    expect(result.owner_summary).toContain("Rapid Plumbing");
    expect(result.owner_summary.toLowerCase()).toContain("urgency");
  });

  it("flags a safety hazard", async () => {
    const result = await provider.runIntake({
      ...baseContext,
      messages: [{ direction: "inbound", body: "I smell a gas leak in the kitchen" }],
    });
    expect(result.risk_flags.length).toBeGreaterThan(0);
    expect(result.should_notify_owner).toBe(true);
  });

  it("stops asking once enough info is collected", async () => {
    const result = await provider.runIntake({
      ...baseContext,
      messages: [
        {
          direction: "inbound",
          body: "Need a plumber to fix a leaking faucet today at 5 Main St, around 3pm please",
        },
      ],
    });
    expect(result.missing_fields).toHaveLength(0);
    expect(result.should_notify_owner).toBe(true);
  });
});

describe("runLeadIntake service", () => {
  it("returns a validated result using the mock provider by default", async () => {
    const run = await runLeadIntake({
      ...baseContext,
      messages: [{ direction: "inbound", body: "AC is not working, need help" }],
    });
    expect(run.provider).toBe("mock");
    expect(run.result.lead_score).toBeGreaterThanOrEqual(0);
    expect(run.result.lead_score).toBeLessThanOrEqual(100);
  });
});
