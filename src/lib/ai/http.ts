import { env } from "@/lib/env";

/**
 * fetch() for real AI providers with an abort timeout and limited retry on
 * transient upstream errors (429 / 5xx) and network failures. A hung provider
 * must never block processIntake (which runs inside the inbound Twilio webhook).
 * On exhausting retries the last response/error is returned/thrown and the AI
 * service layer falls back to the deterministic mock.
 */
export async function aiFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const retries = Math.max(0, env.ai.maxRetries);
  const timeoutMs = env.ai.timeoutMs > 0 ? env.ai.timeoutMs : 12_000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        await delay(250 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("AI request failed");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
