/**
 * Centralized environment access with graceful degradation.
 *
 * The whole product is built to run with ONLY Supabase configured. Every other
 * integration (Twilio, Stripe, Resend, real AI providers) is optional and the
 * app reports "not configured" instead of crashing when keys are missing.
 */

function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function getList(name: string): string[] {
  const v = get(name);
  return v
    ? v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
}

export const env = {
  app: {
    url: get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
    adminEmails: getList("ADMIN_EMAILS"),
  },
  supabase: {
    url: get("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: get("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: get("SUPABASE_SERVICE_ROLE_KEY"),
  },
  ai: {
    provider: (get("AI_PROVIDER") ?? "mock").toLowerCase(),
    openaiKey: get("OPENAI_API_KEY"),
    openaiModel: get("OPENAI_MODEL") ?? "gpt-4o-mini",
    anthropicKey: get("ANTHROPIC_API_KEY"),
    anthropicModel: get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001",
    // Network budget for real-provider calls so a hung LLM never blocks an
    // inbound webhook (which has its own Twilio-side timeout + retries).
    timeoutMs: Number(get("AI_TIMEOUT_MS") ?? "12000"),
    maxRetries: Number(get("AI_MAX_RETRIES") ?? "1"),
  },
  twilio: {
    accountSid: get("TWILIO_ACCOUNT_SID"),
    authToken: get("TWILIO_AUTH_TOKEN"),
    messagingServiceSid: get("TWILIO_MESSAGING_SERVICE_SID"),
    phoneNumber: get("TWILIO_PHONE_NUMBER"),
    validateSignature: (get("TWILIO_VALIDATE_SIGNATURE") ?? "true") !== "false",
  },
  resend: {
    apiKey: get("RESEND_API_KEY"),
    // FROM_EMAIL is the canonical name; RESEND_FROM_EMAIL kept for back-compat.
    fromEmail:
      get("FROM_EMAIL") ??
      get("RESEND_FROM_EMAIL") ??
      "ServiceLead AI <leads@example.com>",
  },
  stripe: {
    secretKey: get("STRIPE_SECRET_KEY"),
    webhookSecret: get("STRIPE_WEBHOOK_SECRET"),
    publishableKey: get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    // Price IDs are not secret; the public names are canonical so the pricing
    // UI can read them. Server-only STRIPE_PRICE_* are accepted as a fallback.
    prices: {
      starter:
        get("NEXT_PUBLIC_STRIPE_PRICE_STARTER") ?? get("STRIPE_PRICE_STARTER"),
      pro: get("NEXT_PUBLIC_STRIPE_PRICE_PRO") ?? get("STRIPE_PRICE_PRO"),
      growth:
        get("NEXT_PUBLIC_STRIPE_PRICE_GROWTH") ?? get("STRIPE_PRICE_GROWTH"),
    },
  },
} as const;

export const isSupabaseConfigured = (): boolean =>
  Boolean(env.supabase.url && env.supabase.anonKey);

export const isTwilioConfigured = (): boolean =>
  Boolean(
    env.twilio.accountSid &&
      env.twilio.authToken &&
      (env.twilio.messagingServiceSid || env.twilio.phoneNumber),
  );

/** Placeholder sender shipped in .env.example — never deliverable. */
export const PLACEHOLDER_FROM_EMAIL = "ServiceLead AI <leads@example.com>";

/**
 * Resend is only *functionally* configured when there's an API key AND a real
 * sender. Leaving the placeholder example.com sender would make every email
 * bounce while reporting "configured" — so we treat that as not configured and
 * fall back to console logging instead of silently dropping notifications.
 */
export const isResendConfigured = (): boolean =>
  Boolean(
    env.resend.apiKey &&
      env.resend.fromEmail &&
      !env.resend.fromEmail.includes("example.com"),
  );

export const isStripeConfigured = (): boolean => Boolean(env.stripe.secretKey);

export const isRealAiConfigured = (): boolean => {
  if (env.ai.provider === "openai") return Boolean(env.ai.openaiKey);
  if (env.ai.provider === "anthropic") return Boolean(env.ai.anthropicKey);
  return false;
};

/** Whether an email is allowlisted for the internal admin/debug area. */
export const isAdminEmail = (email: string | null | undefined): boolean =>
  Boolean(email && env.app.adminEmails.includes(email.toLowerCase()));
