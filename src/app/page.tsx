import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { PLANS, SETUP_FEE } from "@/lib/constants";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <UseCases />
        <PricingTeaser />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-brand-50">
      <div className="container-page grid items-center gap-10 py-20 lg:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            Missed-call recovery for service businesses
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Recover missed calls before they become lost customers.
          </h1>
          <p className="mt-5 text-lg text-gray-600">
            Automatically text missed callers, collect job details, and send your
            team a clean lead summary — so you stop losing business while you're
            on the job.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary text-base">
              Set Up Missed Call Recovery
            </Link>
            <Link href="/pricing" className="btn-secondary text-base">
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No new phone number required in v1 · STOP/opt-out built in · Works
            with a simple forwarding setup.
          </p>
        </div>
        <div className="card p-6">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-gray-900 p-3">
      <div className="rounded-xl bg-white p-4">
        <p className="text-center text-xs font-medium text-gray-400">
          Missed call · 2 min ago
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <Bubble side="out">
            Hi, thanks for contacting Rapid Plumbing! Sorry we missed you. What
            type of service do you need? (Reply STOP to opt out.)
          </Bubble>
          <Bubble side="in">Water heater burst, flooding my garage!</Bubble>
          <Bubble side="out">
            That sounds urgent. What's the address or ZIP so we can dispatch?
          </Bubble>
          <Bubble side="in">142 Oak St, 90210</Bubble>
        </div>
        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
          <strong>Owner summary:</strong> 🚨 Emergency — burst water heater
          flooding garage. 142 Oak St, 90210. Lead score 92/100. Call back now.
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "in" | "out";
  children: React.ReactNode;
}) {
  return (
    <div className={side === "in" ? "flex justify-end" : "flex justify-start"}>
      <span
        className={
          side === "in"
            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-brand-500 px-3 py-2 text-white"
            : "max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-gray-800"
        }
      >
        {children}
      </span>
    </div>
  );
}

function Problem() {
  return (
    <section className="container-page py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold">You can't answer the phone on a ladder.</h2>
        <p className="mt-4 text-lg text-gray-600">
          Service businesses miss calls all day — on jobs, driving, hands full.
          The caller doesn't leave a voicemail; they just call the next company.
          Every missed call is a job that went to a competitor.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { stat: "1 in 4", label: "calls to small businesses go unanswered" },
          { stat: "85%", label: "of missed callers won't call back" },
          { stat: "$1,200+", label: "average value of a lost service job" },
        ].map((s) => (
          <div key={s.label} className="card p-6 text-center">
            <p className="text-3xl font-extrabold text-brand-600">{s.stat}</p>
            <p className="mt-2 text-sm text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">
        Illustrative figures — your results depend on your call volume and
        follow-up.
      </p>
    </section>
  );
}

function Solution() {
  return (
    <section className="bg-white py-16">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">
            Turn every missed call into a captured lead.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            The moment you miss a call, ServiceLead AI texts the caller, asks the
            right intake questions for your trade, and hands you a clean,
            scored lead summary you can act on in seconds.
          </p>
          <ul className="mt-6 space-y-3 text-gray-700">
            {[
              "Missed call → instant SMS",
              "AI asks your service questions",
              "Structured lead + urgency score",
              "Owner gets a summary by email & dashboard",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="card bg-gradient-to-br from-brand-50 to-white p-8">
          <p className="text-sm font-semibold text-brand-700">Flow</p>
          <p className="mt-2 text-2xl font-bold leading-snug text-gray-900">
            Missed call → instant SMS → AI intake → owner summary
          </p>
          <p className="mt-4 text-gray-600">
            You stay in control. Every conversation is visible and editable from
            your dashboard. You decide who to call back first.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Connect or forward",
      body: "Use call-forwarding instructions or connect a number later. No need to replace your existing line in v1.",
    },
    {
      n: 2,
      title: "Missed caller gets an instant SMS",
      body: "Within seconds, the caller receives a friendly text from your business asking how you can help.",
    },
    {
      n: 3,
      title: "AI asks your service questions",
      body: "The assistant qualifies the job — service type, urgency, address, timing — using your custom intake questions.",
    },
    {
      n: 4,
      title: "Owner receives a lead summary",
      body: "You get a clean, scored summary by email and on your dashboard, with a recommended next step.",
    },
  ];
  return (
    <section id="how-it-works" className="container-page py-16">
      <h2 className="text-center text-3xl font-bold">How it works</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
              {s.n}
            </div>
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    { emoji: "🚿", title: "Plumbing emergency", body: "Burst pipe at 7pm — captured, scored urgent, owner alerted." },
    { emoji: "❄️", title: "HVAC repair", body: "No heat in winter — intake collects address and dispatches fast." },
    { emoji: "⚡", title: "Electrical issue", body: "Sparking outlet flagged as a safety hazard with guidance." },
    { emoji: "🧽", title: "Cleaning quote", body: "Square footage and frequency captured for an accurate quote." },
    { emoji: "💇", title: "Salon booking", body: "Service and preferred time collected for easy scheduling." },
  ];
  return (
    <section id="use-cases" className="bg-white py-16">
      <div className="container-page">
        <h2 className="text-center text-3xl font-bold">Built for local service trades</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {cases.map((c) => (
            <div key={c.title} className="card p-5">
              <div className="text-3xl">{c.emoji}</div>
              <h3 className="mt-3 font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section id="pricing" className="container-page py-16">
      <h2 className="text-center text-3xl font-bold">Simple, honest pricing</h2>
      <p className="mt-2 text-center text-gray-600">
        Start small. Upgrade when missed-call recovery is paying for itself.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card p-6 ${plan.highlighted ? "ring-2 ring-brand-500" : ""}`}
          >
            {plan.highlighted && (
              <span className="mb-2 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                Most popular
              </span>
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-2 text-3xl font-extrabold">
              ${plan.price}
              <span className="text-base font-medium text-gray-500">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary mt-6 w-full">
              Get started
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        Optional concierge setup: <strong>${SETUP_FEE} one-time</strong>. See full
        details on the{" "}
        <Link href="/pricing" className="text-brand-600 underline">
          pricing page
        </Link>
        .
      </p>
    </section>
  );
}

function Faq() {
  const faqs = [
    {
      q: "Do I need to replace my number?",
      a: "No. In v1 you can use call forwarding or a simple manual setup. You can connect a dedicated number later when you're ready.",
    },
    {
      q: "Does it auto-call people?",
      a: "No. ServiceLead AI never makes outbound calls and never cold-messages anyone. It only responds to inbound missed calls, SMS replies, and form submissions.",
    },
    {
      q: "Can customers opt out?",
      a: "Yes. STOP / UNSUBSCRIBE / CANCEL are fully supported. Once someone opts out, we never message them again.",
    },
    {
      q: "Is it a full call center?",
      a: "No. It captures and qualifies leads via text and forms. It is not a voice receptionist and does not handle live phone conversations in v1.",
    },
  ];
  return (
    <section id="faq" className="bg-white py-16">
      <div className="container-page mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-gray-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none font-semibold text-gray-900">
                {f.q}
              </summary>
              <p className="mt-2 text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-brand-600">
      <div className="container-page py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Stop losing customers when you miss a call.</h2>
        <p className="mt-3 text-brand-50">
          Set up missed-call recovery in minutes. Try it with the built-in
          simulator before connecting any telephony.
        </p>
        <Link
          href="/signup"
          className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50"
        >
          Set Up Missed Call Recovery
        </Link>
      </div>
    </section>
  );
}
