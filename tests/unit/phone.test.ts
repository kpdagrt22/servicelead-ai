import { describe, it, expect } from "vitest";
import { normalizePhone, normalizePhoneOrRaw, phonesMatch } from "@/lib/phone";

describe("normalizePhone", () => {
  it("normalizes a 10-digit US number to E.164", () => {
    expect(normalizePhone("555-123-4567")).toBe("+15551234567");
    expect(normalizePhone("(555) 123 4567")).toBe("+15551234567");
    expect(normalizePhone("555.123.4567")).toBe("+15551234567");
  });

  it("handles an 11-digit number with leading country code", () => {
    expect(normalizePhone("15551234567")).toBe("+15551234567");
    expect(normalizePhone("1 (555) 123-4567")).toBe("+15551234567");
  });

  it("preserves an already-E.164 number", () => {
    expect(normalizePhone("+15551234567")).toBe("+15551234567");
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
  });

  it("returns null for empty/nullish/too-short input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("no digits here")).toBeNull();
  });
});

describe("phonesMatch", () => {
  it("treats the same contact as equal across formats", () => {
    expect(phonesMatch("+1 (555) 123-4567", "5551234567")).toBe(true);
    expect(phonesMatch("15551234567", "+15551234567")).toBe(true);
  });

  it("rejects different numbers and nullish input", () => {
    expect(phonesMatch("5551234567", "5559999999")).toBe(false);
    expect(phonesMatch(null, "5551234567")).toBe(false);
    expect(phonesMatch("5551234567", undefined)).toBe(false);
  });
});

describe("normalizePhoneOrRaw", () => {
  it("returns the canonical form when possible, trimmed raw otherwise", () => {
    expect(normalizePhoneOrRaw("555-123-4567")).toBe("+15551234567");
    expect(normalizePhoneOrRaw("  ext-1234  ")).toBe("ext-1234");
    expect(normalizePhoneOrRaw("")).toBeNull();
    expect(normalizePhoneOrRaw(null)).toBeNull();
  });
});
