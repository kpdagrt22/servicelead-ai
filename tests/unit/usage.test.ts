import { describe, expect, it } from "vitest";
import {
  evaluateUsage,
  planLeadCap,
  TRIAL_LEAD_CAP,
} from "@/lib/billing/usage";

describe("planLeadCap", () => {
  it("returns the plan cap for known plans", () => {
    expect(planLeadCap("starter")).toBe(50);
    expect(planLeadCap("pro")).toBe(250);
    expect(planLeadCap("growth")).toBe(1000);
  });
  it("falls back to the trial cap for unknown/empty plans", () => {
    expect(planLeadCap(null)).toBe(TRIAL_LEAD_CAP);
    expect(planLeadCap(undefined)).toBe(TRIAL_LEAD_CAP);
    expect(planLeadCap("enterprise")).toBe(TRIAL_LEAD_CAP);
  });
});

describe("evaluateUsage", () => {
  it("reports within-limit usage", () => {
    const u = evaluateUsage(10, 50);
    expect(u.withinLimit).toBe(true);
    expect(u.remaining).toBe(40);
    expect(u.percentUsed).toBe(20);
  });
  it("flags over-limit usage without going negative", () => {
    const u = evaluateUsage(60, 50);
    expect(u.withinLimit).toBe(false);
    expect(u.remaining).toBe(0);
    expect(u.percentUsed).toBe(100);
  });
  it("handles a zero limit safely", () => {
    const u = evaluateUsage(3, 0);
    expect(u.withinLimit).toBe(false);
    expect(u.percentUsed).toBe(100);
    expect(u.remaining).toBe(0);
  });
});
