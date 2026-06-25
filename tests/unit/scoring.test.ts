import { describe, expect, it } from "vitest";
import {
  scoreLabel,
  scoreLead,
  urgencyFromText,
  clamp,
} from "@/lib/leads/scoring";

describe("scoreLead", () => {
  it("scores an emergency with full details higher than a vague low-urgency lead", () => {
    const hot = scoreLead({
      fields: {
        urgency: "emergency",
        service_needed: "burst pipe",
        address: "142 Oak St",
        preferred_time: "now",
        customer_name: "Casey",
      },
      inboundMessageCount: 3,
      emergencyService: true,
    });
    const cold = scoreLead({
      fields: { urgency: "low", service_needed: "general question" },
      inboundMessageCount: 1,
    });
    expect(hot).toBeGreaterThan(cold);
    expect(hot).toBeGreaterThanOrEqual(70);
  });

  it("never exceeds 100 or drops below 0", () => {
    const max = scoreLead({
      fields: {
        urgency: "emergency",
        service_needed: "x",
        address: "y",
        preferred_time: "z",
        customer_name: "n",
        customer_email: "e@e.com",
      },
      inboundMessageCount: 99,
      emergencyService: true,
    });
    expect(max).toBeLessThanOrEqual(100);
    expect(max).toBeGreaterThanOrEqual(0);
  });

  it("gives a baseline score even with empty fields", () => {
    expect(scoreLead({ fields: {} })).toBeGreaterThan(0);
  });
});

describe("urgencyFromText", () => {
  it("detects emergencies", () => {
    expect(urgencyFromText("there is a gas leak in my kitchen")).toBe("emergency");
    expect(urgencyFromText("my basement is flooding")).toBe("emergency");
  });
  it("detects high urgency", () => {
    expect(urgencyFromText("need someone today asap")).toBe("high");
  });
  it("detects medium urgency", () => {
    expect(urgencyFromText("can I get a quote this week")).toBe("medium");
  });
  it("defaults to low", () => {
    expect(urgencyFromText("just wondering about prices")).toBe("low");
  });
});

describe("scoreLabel", () => {
  it("buckets scores", () => {
    expect(scoreLabel(80)).toBe("hot");
    expect(scoreLabel(50)).toBe("warm");
    expect(scoreLabel(20)).toBe("cold");
  });
});

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});
