"use client";

import { useState } from "react";

/** Opens the Stripe Customer Billing Portal (manage payment / cancel). */
export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not open the billing portal.");
    } catch {
      setError("Could not open the billing portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        className="btn-secondary"
      >
        {loading ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
