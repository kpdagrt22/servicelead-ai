"use client";

import { useState } from "react";
import { runSimulationAction } from "@/app/app/simulator/actions";

const SCENARIOS = [
  {
    id: "missed_call",
    title: "Missed call",
    blurb: "Customer called, you missed it. AI sends the first recovery text.",
    placeholder: "(no message — this simulates just the missed call)",
    needsMessage: false,
  },
  {
    id: "sms",
    title: "Inbound SMS",
    blurb: "Customer texts your business with their problem.",
    placeholder: "e.g. My water heater burst and it's flooding the garage!",
    needsMessage: true,
  },
  {
    id: "web_form",
    title: "Web form submission",
    blurb: "Customer fills out your intake form.",
    placeholder: "e.g. Need a quote to clean a 3-bed house next week.",
    needsMessage: true,
  },
] as const;

export function SimulatorForm() {
  const [scenario, setScenario] =
    useState<(typeof SCENARIOS)[number]["id"]>("missed_call");
  const [pending, setPending] = useState(false);
  const current = SCENARIOS.find((s) => s.id === scenario)!;

  return (
    <form
      action={runSimulationAction}
      onSubmit={() => setPending(true)}
      className="space-y-5"
    >
      <input type="hidden" name="scenario" value={scenario} />

      <div className="grid gap-3 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenario(s.id)}
            className={`rounded-xl border p-4 text-left transition ${
              scenario === s.id
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="font-semibold">{s.title}</p>
            <p className="mt-1 text-xs text-gray-500">{s.blurb}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Customer name (optional)</label>
          <input name="customerName" className="input" placeholder="Casey Customer" />
        </div>
        <div>
          <label className="label">Customer phone</label>
          <input
            name="customerPhone"
            className="input"
            placeholder="+1 555 987 6543"
            defaultValue="+15559876543"
            required
          />
        </div>
      </div>

      <div>
        <label className="label">
          {scenario === "missed_call" ? "Message (not used for missed call)" : "Customer message"}
        </label>
        <textarea
          name="message"
          rows={3}
          className="input"
          placeholder={current.placeholder}
          disabled={!current.needsMessage}
          required={current.needsMessage}
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Running intake…" : "Run simulated intake"}
      </button>
      <p className="text-center text-xs text-gray-400">
        This creates a real lead in your account (marked by source) and runs the
        AI intake so you can see the full flow.
      </p>
    </form>
  );
}
