"use client";

import { useState } from "react";
import { URGENCY_LEVELS } from "@/lib/constants";

export function PublicIntakeForm({
  slug,
  organizationId,
  serviceOptions,
}: {
  slug?: string;
  organizationId?: string;
  serviceOptions: string[];
}) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = {
      slug,
      organizationId,
      customerName: form.get("customerName"),
      customerPhone: form.get("customerPhone"),
      customerEmail: form.get("customerEmail"),
      serviceNeeded: form.get("serviceNeeded"),
      urgency: form.get("urgency") || undefined,
      address: form.get("address"),
      details: form.get("details"),
      preferredTime: form.get("preferredTime"),
      consent: form.get("consent") === "on",
    };

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Submission failed");
      setDone(data.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-6 text-center">
        <p className="text-2xl">✅</p>
        <h2 className="mt-2 text-lg font-semibold text-brand-800">Request received</h2>
        <p className="mt-2 text-sm text-brand-700">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Your name</label>
          <input name="customerName" className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input name="customerPhone" className="input" placeholder="Best number to reach you" required />
        </div>
      </div>
      <div>
        <label className="label">Email (optional)</label>
        <input name="customerEmail" type="email" className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">What do you need? *</label>
          <input
            name="serviceNeeded"
            className="input"
            list="service-options"
            placeholder="e.g. Water heater repair"
            required
          />
          <datalist id="service-options">
            {serviceOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">How urgent?</label>
          <select name="urgency" className="input" defaultValue="">
            <option value="">Not sure</option>
            {URGENCY_LEVELS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Address / ZIP (optional)</label>
        <input name="address" className="input" placeholder="Service address or ZIP" />
      </div>
      <div>
        <label className="label">Describe the issue *</label>
        <textarea name="details" rows={3} className="input" required />
      </div>
      <div>
        <label className="label">Preferred time (optional)</label>
        <input name="preferredTime" className="input" placeholder="e.g. Tomorrow morning" />
      </div>

      <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <input type="checkbox" name="consent" className="mt-1 h-4 w-4" required />
        <span>
          I agree to be contacted (including by SMS) about this request. Message
          and data rates may apply. Reply STOP at any time to opt out.
        </span>
      </label>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Sending…" : "Send my request"}
      </button>
    </form>
  );
}
