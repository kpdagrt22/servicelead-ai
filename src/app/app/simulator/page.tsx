import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SimulatorForm } from "@/components/app/simulator-form";
import {
  isRealAiConfigured,
  isTwilioConfigured,
} from "@/lib/env";
import { env } from "@/lib/env";

export const metadata = { title: "Simulator — ServiceLead AI" };

export default async function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const ctx = await requireOrg();
  const { error, msg } = await searchParams;
  const supabase = await createClient();
  const { data: cats } = await supabase
    .from("service_categories")
    .select("name")
    .eq("organization_id", ctx.organization.id)
    .eq("active", true)
    .order("name", { ascending: true });
  const serviceOptions = (cats ?? []).map((c) => c.name as string);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead intake simulator</h1>
        <p className="text-sm text-gray-500">
          Validate the whole product — missed call, SMS, or web form — before
          connecting any real telephony.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error === "not_configured"
            ? "Supabase isn't configured yet, so the simulator can't run."
            : (msg ?? "Could not run the simulation. Check the inputs and try again.")}
        </p>
      )}

      <div className="card p-6">
        <SimulatorForm serviceOptions={serviceOptions} />
      </div>

      <div className="card p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-800">What's running right now</p>
        <ul className="mt-2 space-y-1">
          <li>
            AI provider:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5">
              {env.ai.provider}
            </code>{" "}
            {isRealAiConfigured()
              ? "(live)"
              : "(mock — deterministic, no API key needed)"}
          </li>
          <li>
            Twilio:{" "}
            {isTwilioConfigured()
              ? "configured (replies can send real SMS)"
              : "not configured (sends are simulated/logged)"}
          </li>
        </ul>
      </div>
    </div>
  );
}
