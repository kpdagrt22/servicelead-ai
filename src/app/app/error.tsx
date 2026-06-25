"use client";

import { useEffect } from "react";

/**
 * Error boundary for the authenticated dashboard. Keeps a failed page from
 * taking down the whole app and gives the owner a way to recover.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-3xl">⚠️</p>
      <h1 className="mt-3 text-xl font-bold">Something went wrong</h1>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        We hit an unexpected error loading this page. Your data is safe — try
        again, and if it keeps happening, check your configuration.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/app" className="btn-secondary">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
