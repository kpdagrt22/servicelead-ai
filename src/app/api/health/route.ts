import { NextResponse } from "next/server";
import {
  env,
  isResendConfigured,
  isStripeConfigured,
  isSupabaseConfigured,
  isTwilioConfigured,
  isRealAiConfigured,
} from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Liveness + configuration probe. Safe to expose: reports ONLY booleans about
 * which integrations are configured — never any keys or secrets. Useful for
 * uptime monitors and post-deploy smoke checks.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "servicelead-ai",
    time: new Date().toISOString(),
    integrations: {
      supabase: isSupabaseConfigured(),
      aiProvider: env.ai.provider,
      realAi: isRealAiConfigured(),
      twilio: isTwilioConfigured(),
      resend: isResendConfigured(),
      stripe: isStripeConfigured(),
    },
  });
}
