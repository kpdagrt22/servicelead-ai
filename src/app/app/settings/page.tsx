import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  env,
  isRealAiConfigured,
  isResendConfigured,
  isStripeConfigured,
  isTwilioConfigured,
} from "@/lib/env";
import type { TwilioNumber } from "@/types/database";
import { addTwilioNumberAction, updateSettingsAction } from "./actions";

export const metadata = { title: "Settings — ServiceLead AI" };

function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-brand-500" : "bg-gray-300"}`}
    />
  );
}

const NUMBER_ERRORS: Record<string, string> = {
  invalid: "That doesn't look like a valid phone number.",
  taken: "That number is already registered to another account.",
  already_yours: "You've already registered that number.",
  failed: "Could not register the number. Please try again.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    numberAdded?: string;
    numberError?: string;
    error?: string;
  }>;
}) {
  const ctx = await requireOrg();
  const org = ctx.organization;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: numbers } = await supabase
    .from("twilio_numbers")
    .select("*")
    .eq("organization_id", org.id);
  const twilioNumbers = (numbers ?? []) as TwilioNumber[];

  const publicUrl = `${env.app.url}/u/${org.slug}`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {sp.saved && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          ✅ Settings saved.
        </p>
      )}
      {sp.numberAdded && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          ✅ Number registered for inbound routing.
        </p>
      )}
      {sp.numberError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {NUMBER_ERRORS[sp.numberError] ?? "Could not register the number."}
        </p>
      )}
      {sp.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Please check the form and try again.
        </p>
      )}

      {/* Integration status */}
      <section className="card p-5">
        <h2 className="font-semibold">Integrations</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <StatusDot on /> Supabase — connected
          </li>
          <li className="flex items-center gap-2">
            <StatusDot on={isRealAiConfigured()} /> AI provider —{" "}
            {isRealAiConfigured() ? `${env.ai.provider} (live)` : "mock (default)"}
          </li>
          <li className="flex items-center gap-2">
            <StatusDot on={isTwilioConfigured()} /> Twilio SMS —{" "}
            {isTwilioConfigured() ? "configured" : "not configured (simulated)"}
          </li>
          <li className="flex items-center gap-2">
            <StatusDot on={isResendConfigured()} /> Resend email —{" "}
            {isResendConfigured() ? "configured" : "console fallback"}
          </li>
          <li className="flex items-center gap-2">
            <StatusDot on={isStripeConfigured()} /> Stripe billing —{" "}
            {isStripeConfigured() ? "configured" : "trial mode"}
          </li>
        </ul>
      </section>

      {/* Business settings */}
      <section className="card p-5">
        <h2 className="font-semibold">Business details & notifications</h2>
        <form action={updateSettingsAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Business name</label>
            <input name="name" className="input" defaultValue={org.name} required />
          </div>
          <div>
            <label className="label">Business phone</label>
            <input name="phone" className="input" defaultValue={org.phone ?? ""} />
          </div>
          <div>
            <label className="label">Website</label>
            <input name="website" className="input" defaultValue={org.website ?? ""} />
          </div>
          <div>
            <label className="label">Owner notification email</label>
            <input
              name="notificationEmail"
              type="email"
              className="input"
              defaultValue={org.notification_email ?? ""}
            />
          </div>
          <div>
            <label className="label">Owner notification phone</label>
            <input
              name="notificationPhone"
              className="input"
              defaultValue={org.notification_phone ?? ""}
            />
          </div>
          <div>
            <label className="label">Booking link</label>
            <input
              name="bookingLink"
              className="input"
              defaultValue={org.booking_link ?? ""}
            />
          </div>
          <div>
            <label className="label">Google review link</label>
            <input
              name="reviewLink"
              className="input"
              defaultValue={org.review_link ?? ""}
            />
          </div>
          <label className="flex items-center gap-3 pt-7">
            <input
              type="checkbox"
              name="emergencyService"
              defaultChecked={org.emergency_service}
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">Offers emergency service</span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save settings
            </button>
          </div>
        </form>
      </section>

      {/* SMS / Twilio config */}
      <section className="card p-5">
        <h2 className="font-semibold">Configure SMS (Twilio)</h2>
        <p className="mt-1 text-sm text-gray-500">
          Optional. In v1 you can run everything via the simulator and public
          form. When you're ready, register your Twilio number here and point its
          webhooks at this app (see docs/TWILIO_SETUP.md).
        </p>
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <p>Inbound SMS webhook: <code>{env.app.url}/api/twilio/sms/inbound</code></p>
          <p>Status callback: <code>{env.app.url}/api/twilio/sms/status</code></p>
          <p>Missed-call (voice): <code>{env.app.url}/api/twilio/voice/missed-call-placeholder</code></p>
        </div>
        <form action={addTwilioNumberAction} className="mt-4 flex flex-wrap gap-2">
          <input
            name="phoneNumber"
            className="input flex-1"
            placeholder="+1 555 010 0000 (your Twilio number)"
            required
          />
          <button type="submit" className="btn-secondary">
            Register number
          </button>
        </form>
        {twilioNumbers.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            {twilioNumbers.map((n) => (
              <li key={n.id}>
                {n.phone_number} · {n.status ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Public link & compliance */}
      <section className="card p-5">
        <h2 className="font-semibold">Public intake link</h2>
        <code className="mt-2 block rounded bg-gray-100 px-3 py-2 text-xs">
          {publicUrl}
        </code>
        <p className="mt-3 text-xs text-gray-400">
          ServiceLead AI only responds to inbound, customer-initiated requests.
          STOP/opt-out is always honored. You are responsible for the final
          service response. See docs/COMPLIANCE.md.
        </p>
      </section>
    </div>
  );
}
