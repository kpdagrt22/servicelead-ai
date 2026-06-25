# ServiceLead AI — 5-Minute Founder Demo Script

A crisp, non-technical walkthrough you can follow live. Each step has the route
to open and a one-line **talk track** to say out loud. Total time: ~5 minutes.

> Before you start: have the app open in a browser, be ready to sign in, and make
> sure your org has at least one service category (or add one in step 4). No
> external keys are required — the AI runs in deterministic mock mode.

---

## 1. Open the landing page — `/`

**Talk track:** "Service businesses lose jobs every time they miss a call. This
turns missed calls and web inquiries into qualified, ready-to-act leads."

## 2. Sign in — `/login`

**Talk track:** "Let me sign in to the owner's dashboard."

## 3. Show the dashboard — `/app`

Point out the headline metrics and the CTA cards.

- **New leads today**
- **Urgent leads**
- **Leads this month**
- **AI summaries**

**Talk track:** "At a glance: who came in today, who's urgent, the monthly
volume, and the AI summaries already done for you — no spreadsheet, no manual
note-taking."

## 4. Configure a service category — `/app/intake`

Quick-add a category, e.g. **"HVAC repair"**, and show the editable intake
questions underneath it.

**Talk track:** "You tell it what you do — say HVAC repair — and these intake
questions are fully editable so the AI asks exactly what your business needs."

## 5. Open the missed-call simulator — `/app/simulator`

**Talk track:** "I don't need a real phone to show this — the simulator
reproduces a real missed call, SMS, or web form."

## 6. Simulate a missed call — `/app/simulator`

Fill the form:

- Scenario: **missed_call**
- Caller phone: any demo number (e.g. `+15551234567`)
- Service category: **HVAC repair**
- Message: **"AC not cooling, wants appointment tomorrow"**

Submit it.

**Talk track:** "A customer just called and missed us. Watch what happens
automatically."

## 7. Show the AI intake summary — lead detail (`/app/leads/[id]`)

Open the new lead and read its AI summary aloud.

**Talk track:** "Within seconds the AI has read the call and written a clean
summary — what they need and what they want next."

## 8. Show the urgency score — lead detail

Point at the urgency indicator.

**Talk track:** "It also scores urgency, so your team knows who to call back
first — this AC-not-cooling job ranks high."

## 9. Show full lead detail — `/app/leads/[id]`

Walk through the structured view:

- **Extracted fields** (name, phone, service, preferred time, etc.)
- **Conversation** transcript
- **Missing fields** the AI still needs
- **Risk flags**

**Talk track:** "Everything is structured: the facts it pulled out, the full
conversation, what's still missing, and any risk flags — so nothing slips
through."

## 10. Show the suggested follow-up reply — lead detail

Point at the copyable suggested reply.

**Talk track:** "It even drafts the follow-up message for you — one click to copy
and send, in your voice, ready to book the job."

## 11. Explain STOP / opt-out handling

**Talk track:** "We're inbound-only and fully compliant. If a contact texts STOP,
UNSUBSCRIBE, or CANCEL, that phone is opted out across all of their leads — and
we never message an opted-out contact again. Consent is stored, and we never do
medical or emergency triage."

## 12. Open the public intake form — `/u/[slug]`

Open your org's public link `/u/your-org-slug`.

**Talk track:** "Here's the link you put on your website or Google profile.
Customers can request service directly."

## 13. Submit a sample customer request — `/u/[slug]`

Fill required fields — **phone** and **details** — plus name, service category
(HVAC repair), urgency, and check the **consent** box. Submit.

**Talk track:** "A homeowner just filled this out — phone, what's wrong, and
consent to be contacted."

## 14. Return to the dashboard — `/app`

Show the metrics/leads updated with the new submission.

**Talk track:** "And it's already on the dashboard — every channel flows into one
inbox, summarized and prioritized."

## 15. Explain pricing — `/pricing`

**Talk track:** "Pricing is simple: **Starter $29/mo** for 50 leads, **Pro
$79/mo** for 250, **Growth $149/mo** for 1,000 — plus a one-time **$99 setup**.
No guaranteed-revenue gimmicks; just more booked jobs from calls you were already
getting."

---

## Reset for the next demo

- Sign in to a clean demo account, **or** delete the demo leads you created from
  `/app/leads`.
- Re-run the simulator (`/app/simulator`) to generate fresh sample leads.
- Default service categories are auto-seeded on org creation, so a brand-new demo
  org starts ready to go — sign up, onboard, and you're back to step 1.

> Tip: keep a dedicated "demo" organization so live demos never touch real
> customer data.
