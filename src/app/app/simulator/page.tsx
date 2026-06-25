import { requireOrg } from "@/lib/auth";
import { SimulatorForm } from "@/components/app/simulator-form";
import {
  isRealAiConfigured,
  isTwilioConfigured,
} from "@/lib/env";
import { env } from "@/lib/env";

export const metadata = { title: "Simulator — ServiceLead AI" };

export default async function SimulatorPage() {
  await requireOrg();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead intake simulator</h1>
        <p className="text-sm text-gray-500">
          Validate the whole product — missed call, SMS, or web form — before
          connecting any real telephony.
        </p>
      </div>

      <div className="card p-6">
        <SimulatorForm />
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
