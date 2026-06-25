import { describe, expect, it } from "vitest";
import {
  intakeQuestionSchema,
  publicIntakeSchema,
  serviceCategorySchema,
  simulatorSchema,
} from "@/lib/validation/schemas";

describe("serviceCategorySchema", () => {
  it("requires a name", () => {
    expect(serviceCategorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(serviceCategorySchema.safeParse({ name: "x" }).success).toBe(false); // min 2
    expect(
      serviceCategorySchema.safeParse({ name: "Plumbing" }).success,
    ).toBe(true);
  });
  it("defaults active to true", () => {
    const parsed = serviceCategorySchema.parse({ name: "Plumbing" });
    expect(parsed.active).toBe(true);
  });
});

describe("intakeQuestionSchema", () => {
  it("requires key, label, and required flag", () => {
    expect(
      intakeQuestionSchema.safeParse({
        key: "urgency",
        label: "Is it urgent?",
        required: true,
      }).success,
    ).toBe(true);
    expect(
      intakeQuestionSchema.safeParse({ key: "", label: "", required: true })
        .success,
    ).toBe(false);
  });
});

describe("publicIntakeSchema", () => {
  const valid = {
    slug: "demo",
    customerPhone: "+15551234567",
    serviceNeeded: "Water heater repair",
    details: "It burst and is leaking",
    consent: true,
  };
  it("accepts a valid submission", () => {
    expect(publicIntakeSchema.safeParse(valid).success).toBe(true);
  });
  it("requires consent to be true", () => {
    expect(
      publicIntakeSchema.safeParse({ ...valid, consent: false }).success,
    ).toBe(false);
  });
  it("requires a phone number", () => {
    expect(
      publicIntakeSchema.safeParse({ ...valid, customerPhone: "" }).success,
    ).toBe(false);
  });
  it("requires service + details", () => {
    expect(
      publicIntakeSchema.safeParse({ ...valid, serviceNeeded: "" }).success,
    ).toBe(false);
    expect(
      publicIntakeSchema.safeParse({ ...valid, details: "" }).success,
    ).toBe(false);
  });
});

describe("simulatorSchema", () => {
  it("validates scenarios and phone", () => {
    expect(
      simulatorSchema.safeParse({
        scenario: "missed_call",
        customerPhone: "+15551234567",
      }).success,
    ).toBe(true);
    expect(
      simulatorSchema.safeParse({
        scenario: "invalid",
        customerPhone: "+15551234567",
      }).success,
    ).toBe(false);
  });
});
