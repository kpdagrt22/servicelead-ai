import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { PLANS, SETUP_FEE } from "@/lib/constants";

export const metadata = { title: "Pricing — ServiceLead AI" };

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-page py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-extrabold">Pricing that pays for itself</h1>
            <p className="mt-3 text-lg text-gray-600">
              One recovered job usually covers your monthly plan. No long
              contracts.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`card flex flex-col p-7 ${
                  plan.highlighted ? "ring-2 ring-brand-500" : ""
                }`}
              >
                {plan.highlighted && (
                  <span className="mb-2 inline-block w-fit rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    Most popular
                  </span>
                )}
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="mt-2 text-4xl font-extrabold">
                  ${plan.price}
                  <span className="text-base font-medium text-gray-500">/mo</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Up to {plan.leadCap.toLocaleString()} recovered leads / month
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-gray-700">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plan=${plan.id}`}
                  className={
                    plan.highlighted
                      ? "btn-primary mt-6 w-full"
                      : "btn-secondary mt-6 w-full"
                  }
                >
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <h3 className="text-lg font-semibold">Concierge setup — ${SETUP_FEE} one-time</h3>
            <p className="mt-2 text-sm text-gray-600">
              We'll configure your service categories, intake questions, and
              forwarding for you, and run a live test lead end-to-end.
            </p>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-gray-400">
            We never claim guaranteed bookings or guaranteed revenue. Results
            depend on your call volume and how quickly you follow up. Billing is
            handled by Stripe; if billing isn't configured yet you can still use
            the product in trial/simulation mode.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
