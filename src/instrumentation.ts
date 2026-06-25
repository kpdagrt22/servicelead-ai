/**
 * Next.js instrumentation hook — runs once when the server boots.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge), where console + env are stable.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logStartupConfig } = await import("@/lib/startup");
    logStartupConfig();
  }
}
