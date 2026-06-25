import { describe, expect, it } from "vitest";
import {
  leadIntakeResultSchema,
  parseLeadIntakeResult,
} from "@/lib/ai/schemas/lead-intake";

const valid = {
  extracted_fields: {
    service_needed: "Water heater repair",
    urgency: "emergency",
    address: "142 Oak St",
    preferred_time: "now",
    customer_name: "Casey",
    customer_email: null,
    notes: "burst, flooding",
  },
  next_message_to_customer: "We're on it — what's the address?",
  should_notify_owner: true,
  owner_summary: "Emergency burst water heater.",
  lead_score: 92,
  missing_fields: [],
  risk_flags: [],
  confidence: 0.9,
};

describe("leadIntakeResultSchema", () => {
  it("accepts a valid result", () => {
    expect(() => leadIntakeResultSchema.parse(valid)).not.toThrow();
  });

  it("rejects an out-of-range score", () => {
    expect(() =>
      leadIntakeResultSchema.parse({ ...valid, lead_score: 150 }),
    ).toThrow();
  });

  it("rejects an invalid urgency enum", () => {
    expect(() =>
      leadIntakeResultSchema.parse({
        ...valid,
        extracted_fields: { ...valid.extracted_fields, urgency: "super-urgent" },
      }),
    ).toThrow();
  });
});

describe("parseLeadIntakeResult coercion", () => {
  it("coerces a string score and missing arrays from a sloppy model", () => {
    const result = parseLeadIntakeResult({
      ...valid,
      lead_score: "80",
      confidence: "0.7",
      missing_fields: undefined,
      risk_flags: undefined,
    });
    expect(result.lead_score).toBe(80);
    expect(result.confidence).toBeCloseTo(0.7);
    expect(result.missing_fields).toEqual([]);
    expect(result.risk_flags).toEqual([]);
  });

  it("rounds a float score from a real model instead of rejecting it", () => {
    const result = parseLeadIntakeResult({ ...valid, lead_score: 82.5 });
    expect(result.lead_score).toBe(83);
    expect(Number.isInteger(result.lead_score)).toBe(true);
  });
});
