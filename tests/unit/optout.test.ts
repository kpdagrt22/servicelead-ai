import { describe, expect, it } from "vitest";
import {
  canSendSms,
  detectOptOutAction,
  isStartMessage,
  isStopMessage,
} from "@/lib/twilio/optout";

describe("opt-out detection", () => {
  it("detects STOP and variants as the first word", () => {
    expect(isStopMessage("STOP")).toBe(true);
    expect(isStopMessage("stop")).toBe(true);
    expect(isStopMessage("Unsubscribe please")).toBe(true);
    expect(isStopMessage("CANCEL")).toBe(true);
    expect(isStopMessage("quit")).toBe(true);
  });

  it("does not opt out when 'stop' appears mid-sentence", () => {
    expect(isStopMessage("please don't stop helping me")).toBe(false);
    expect(isStopMessage("my sink won't stop leaking")).toBe(false);
  });

  it("detects START/opt-in keywords only as a sole-word reply", () => {
    expect(isStartMessage("START")).toBe(true);
    expect(isStartMessage("  Start ")).toBe(true);
    expect(detectOptOutAction("unstop")).toBe("opt_in");
    // 'yes' is no longer a blanket opt-in keyword
    expect(isStartMessage("yes")).toBe(false);
    // a normal reply that merely begins with an opt-in-ish word is not opt-in
    expect(detectOptOutAction("start over with a new quote please")).toBe("none");
  });

  it("returns none for normal messages", () => {
    expect(detectOptOutAction("I need a plumber")).toBe("none");
    expect(detectOptOutAction("")).toBe("none");
  });
});

describe("canSendSms", () => {
  it("blocks opted-out leads", () => {
    const res = canSendSms({ opt_out: true, customer_phone: "+15551234567" });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("lead_opted_out");
  });

  it("blocks leads with no phone", () => {
    const res = canSendSms({ opt_out: false, customer_phone: null });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("no_phone");
  });

  it("allows reachable, consenting leads", () => {
    const res = canSendSms({ opt_out: false, customer_phone: "+15551234567" });
    expect(res.allowed).toBe(true);
  });
});
