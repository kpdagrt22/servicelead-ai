import { describe, it, expect, vi } from "vitest";

/** Load a fresh copy of the env module with a controlled process.env. */
async function loadEnv(vars: Record<string, string>) {
  vi.resetModules();
  for (const k of ["RESEND_API_KEY", "FROM_EMAIL", "RESEND_FROM_EMAIL"]) {
    delete process.env[k];
  }
  Object.assign(process.env, vars);
  return import("@/lib/env");
}

describe("isResendConfigured (truthful config signal)", () => {
  it("is false with no API key", async () => {
    const { isResendConfigured } = await loadEnv({});
    expect(isResendConfigured()).toBe(false);
  });

  it("is false when the sender is the example.com placeholder", async () => {
    const { isResendConfigured } = await loadEnv({
      RESEND_API_KEY: "re_test",
      FROM_EMAIL: "ServiceLead AI <leads@example.com>",
    });
    expect(isResendConfigured()).toBe(false);
  });

  it("is true with an API key and a real sender", async () => {
    const { isResendConfigured } = await loadEnv({
      RESEND_API_KEY: "re_test",
      FROM_EMAIL: "ServiceLead AI <leads@acme.co>",
    });
    expect(isResendConfigured()).toBe(true);
  });
});

describe("isAdminEmail", () => {
  it("matches case-insensitively against ADMIN_EMAILS", async () => {
    vi.resetModules();
    process.env.ADMIN_EMAILS = "Owner@Acme.co, ops@acme.co";
    const { isAdminEmail } = await import("@/lib/env");
    expect(isAdminEmail("owner@acme.co")).toBe(true);
    expect(isAdminEmail("OPS@ACME.CO")).toBe(true);
    expect(isAdminEmail("stranger@acme.co")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});
