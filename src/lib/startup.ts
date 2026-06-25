import {
  env,
  isResendConfigured,
  isStripeConfigured,
  isSupabaseConfigured,
  isTwilioConfigured,
  isRealAiConfigured,
} from "@/lib/env";

/**
 * Logs a one-time configuration summary at server start and warns (never
 * throws) when something important is missing. We intentionally do NOT throw on
 * missing Supabase: the marketing surface runs without any backend, and the
 * whole product is built around graceful degradation. Failing the process would
 * break that contract.
 */
export function logStartupConfig(): void {
  const status = {
    appUrl: env.app.url,
    supabase: isSupabaseConfigured(),
    aiProvider: env.ai.provider,
    realAi: isRealAiConfigured(),
    twilio: isTwilioConfigured(),
    resend: isResendConfigured(),
    stripe: isStripeConfigured(),
  };

  console.info("[startup] ServiceLead AI configuration:", status);

  if (!isSupabaseConfigured()) {
    console.warn(
      "[startup] Supabase is NOT configured. Auth, onboarding, dashboard, and " +
        "lead intake are disabled until NEXT_PUBLIC_SUPABASE_URL, " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set.",
    );
  } else if (!env.supabase.serviceRoleKey) {
    console.warn(
      "[startup] SUPABASE_SERVICE_ROLE_KEY is missing. Public intake form, " +
        "Twilio webhooks, and AI logging require the service role.",
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    isTwilioConfigured() &&
    !env.twilio.validateSignature
  ) {
    console.warn(
      "[startup] TWILIO_VALIDATE_SIGNATURE=false is ignored in production; " +
        "webhook signatures are always validated.",
    );
  }
}
