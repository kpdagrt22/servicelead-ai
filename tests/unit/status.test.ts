import { describe, expect, it } from "vitest";
import {
  canTransition,
  canTransitionLeadStatus,
  getLeadStatusBadgeVariant,
  getLeadStatusLabel,
  isLeadStatus,
  nextStatuses,
} from "@/lib/leads/status";

describe("lead status transitions", () => {
  it("allows new → contacted/booked/won/lost", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("new", "booked")).toBe(true);
    expect(canTransition("new", "won")).toBe(true);
    expect(canTransition("new", "lost")).toBe(true);
  });

  it("allows staying in the same status", () => {
    expect(canTransition("won", "won")).toBe(true);
  });

  it("blocks won → contacted (cannot un-win into mid-pipeline)", () => {
    expect(canTransition("won", "contacted")).toBe(false);
  });

  it("allows reopening a lost lead", () => {
    expect(canTransition("lost", "new")).toBe(true);
    expect(canTransition("lost", "contacted")).toBe(true);
  });

  it("exposes valid next statuses", () => {
    expect(nextStatuses("new")).toContain("contacted");
    expect(nextStatuses("booked")).toContain("won");
  });

  it("validates status strings", () => {
    expect(isLeadStatus("new")).toBe(true);
    expect(isLeadStatus("spam")).toBe(true);
    expect(isLeadStatus("archived")).toBe(true);
    expect(isLeadStatus("nonsense")).toBe(false);
  });

  it("supports spam and archived transitions", () => {
    expect(canTransitionLeadStatus("new", "spam")).toBe(true);
    expect(canTransitionLeadStatus("new", "archived")).toBe(true);
    // can recover a spam lead, and restore an archived one
    expect(canTransitionLeadStatus("spam", "new")).toBe(true);
    expect(canTransitionLeadStatus("archived", "contacted")).toBe(true);
    // canTransition is an alias of canTransitionLeadStatus
    expect(canTransition).toBe(canTransitionLeadStatus);
  });

  it("provides labels and badge variants for every status", () => {
    expect(getLeadStatusLabel("new")).toBe("New");
    expect(getLeadStatusLabel("spam")).toBe("Spam");
    expect(getLeadStatusBadgeVariant("won")).toBe("success");
    expect(getLeadStatusBadgeVariant("spam")).toBe("danger");
    expect(getLeadStatusBadgeVariant("archived")).toBe("neutral");
  });
});
