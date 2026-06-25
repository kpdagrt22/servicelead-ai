"use client";

import { useActionState } from "react";
import {
  createOrganizationAction,
  type OnboardingState,
} from "@/app/onboarding/actions";
import { DEFAULT_SERVICE_CATEGORIES } from "@/lib/constants";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Australia/Sydney",
  "Australia/Perth",
];

const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Ireland", "Germany", "Other"];

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

export function OnboardingForm({
  defaultOwnerName,
  defaultEmail,
}: {
  defaultOwnerName: string;
  defaultEmail: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    createOrganizationAction,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {/* Business basics */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Business
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Business name</label>
            <input name="businessName" className="input" required />
            <FieldError msg={fe.businessName} />
          </div>
          <div>
            <label className="label">Business type</label>
            <input
              name="businessType"
              className="input"
              placeholder="e.g. Plumbing, HVAC, Cleaning"
            />
          </div>
          <div>
            <label className="label">Your name</label>
            <input
              name="ownerName"
              className="input"
              defaultValue={defaultOwnerName}
              required
            />
            <FieldError msg={fe.ownerName} />
          </div>
          <div>
            <label className="label">Account email</label>
            <input
              name="email"
              type="email"
              className="input"
              defaultValue={defaultEmail}
              required
            />
            <FieldError msg={fe.email} />
          </div>
          <div>
            <label className="label">Business phone</label>
            <input name="phone" className="input" placeholder="+1 555 123 4567" required />
            <FieldError msg={fe.phone} />
          </div>
          <div>
            <label className="label">Website (optional)</label>
            <input name="website" className="input" placeholder="https://" />
            <FieldError msg={fe.website} />
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Location & hours
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Country</label>
            <select name="country" className="input" defaultValue="United States" required>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <FieldError msg={fe.country} />
          </div>
          <div>
            <label className="label">Time zone</label>
            <select name="timezone" className="input" defaultValue="America/New_York" required>
              {TIMEZONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <FieldError msg={fe.timezone} />
          </div>
          <div>
            <label className="label">State / Province</label>
            <input name="state" className="input" />
          </div>
          <div>
            <label className="label">City</label>
            <input name="city" className="input" />
          </div>
          <div>
            <label className="label">Default response expectation</label>
            <select name="defaultResponseDelay" className="input" defaultValue="Within 5 minutes">
              <option>Instant</option>
              <option>Within 5 minutes</option>
              <option>Within 30 minutes</option>
              <option>Within an hour</option>
            </select>
          </div>
          <label className="flex items-center gap-3 pt-7">
            <input type="checkbox" name="emergencyService" className="h-4 w-4" />
            <span className="text-sm text-gray-700">
              We offer emergency / after-hours service
            </span>
          </label>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Services you offer
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEFAULT_SERVICE_CATEGORIES.map((c) => (
            <label
              key={c.name}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                name="serviceCategories"
                value={c.name}
                defaultChecked
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  {c.name}
                </span>
                <span className="block text-xs text-gray-500">{c.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Notifications & links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Owner notification email</label>
            <input
              name="notificationEmail"
              type="email"
              className="input"
              defaultValue={defaultEmail}
              required
            />
            <FieldError msg={fe.notificationEmail} />
          </div>
          <div>
            <label className="label">Owner notification phone (optional)</label>
            <input name="notificationPhone" className="input" />
          </div>
          <div>
            <label className="label">Booking link (optional)</label>
            <input name="bookingLink" className="input" placeholder="https://calendly.com/…" />
            <FieldError msg={fe.bookingLink} />
          </div>
          <div>
            <label className="label">Google review link (optional)</label>
            <input name="reviewLink" className="input" placeholder="https://g.page/…" />
            <FieldError msg={fe.reviewLink} />
          </div>
        </div>
      </section>

      {/* Consent */}
      <section className="rounded-lg bg-gray-50 p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="smsConsent" className="mt-1 h-4 w-4" required />
          <span className="text-sm text-gray-700">
            I confirm I will only use ServiceLead AI to respond to inbound
            customers (missed calls, replies, and form submissions) and that I am
            responsible for obtaining any required consent. I understand STOP /
            opt-out requests are always honored and this is not for cold
            outbound messaging.
          </span>
        </label>
        <FieldError msg={fe.smsConsent} />
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Setting up…" : "Finish setup & go to dashboard"}
      </button>
    </form>
  );
}
