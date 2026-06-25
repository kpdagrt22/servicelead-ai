"use client";

import { useState } from "react";
import type { Plan } from "@/lib/constants";

export function CheckoutButton({
  plan,
  disabled,
  highlighted,
}: {
  plan: Plan;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={disabled || loading}
        className={
          highlighted ? "btn-primary w-full" : "btn-secondary w-full"
        }
      >
        {loading ? "Redirecting…" : `Choose ${plan.name}`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
