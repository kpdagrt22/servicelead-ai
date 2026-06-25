# Validation Plan — ServiceLead AI

The goal of v1 is to **validate demand and usefulness before building more**.
ServiceLead AI is inbound missed-call recovery + AI lead-intake for local
service businesses. It is **not** cold outbound, **not** a CRM, **not** a voice
receptionist (v1), and **not** medical triage.

Resist adding features until real service businesses confirm value. This plan is
written for the **founder** doing manual, concierge-style validation.

---

## 1. Recommended first niche

Pick **ONE** niche and go deep. Spreading across five at once dilutes your
outreach and your learning.

### Candidate niches

- **HVAC** (heating / cooling / AC)
- **Plumbers**
- **Electricians**
- **Cleaning** (residential / commercial)
- **Pest control**

### Recommendation: start with **HVAC** (plumbers are the close second)

Judged against five criteria:

| Criterion | Why HVAC wins |
|-----------|---------------|
| **Easy to reach** | Dense on Google Maps, almost all list a mobile/business number, many active on Facebook. |
| **Urgent missed calls** | "No AC in summer / no heat in winter" callers will not wait — they call the next company. A missed call is a lost job *today*. |
| **High lead value** | A single repair/install job is hundreds to thousands of dollars, so one recovered lead pays for the tool many times over. |
| **Willingness to pay** | Owners already understand "a missed call = lost money," so $29–$79/mo is an easy ROI story. |
| **Low compliance risk** | Pure inbound follow-up to people who just contacted them; no medical data, no sensitive categories. |

**Plumbers** share nearly all of these traits (urgent, high-value, easy to find)
and are a strong fallback if HVAC outreach stalls. **Electricians** are similar
but a bit lower call volume. **Cleaning** and **pest control** are valid but
have lower per-job value and (for cleaning) less time-urgency, so save them for
after the first niche is proven.

> Decision rule: commit to HVAC for the full 30 days. Only switch niches if you
> hit a **kill metric** (see below), not because outreach felt slow in week 1.

---

## 2. Hypotheses to test

1. Service businesses lose meaningful revenue from missed calls.
2. An instant SMS + AI intake captures leads they would otherwise lose.
3. A clean owner summary is genuinely useful for fast follow-up.
4. Owners will pay **$29–$79/month** for this.

---

## 3. The 7-day validation plan (day-by-day)

The first week is about **conversations, not code**. Target ~30 businesses.

- **Day 1 — Build the target list.**
  Use Google Maps (Section 7) to pull **30 HVAC businesses** in 1–2 metro areas.
  Record name, phone, website, and whether they have Facebook. Put them in a
  simple sheet with a "status" column.

- **Day 2 — Prepare assets.**
  Finalize the concierge offer (Section 4), the cold outreach email (Section 5),
  and the Facebook DM (Section 6). Do a dry run of the demo
  (`docs/DEMO_SCRIPT.md`) end to end so you can show it live.

- **Day 3 — First outreach wave.**
  Send **15** personalized cold emails and **10** Facebook DMs. Personalize the
  first line ("Saw you handle AC repair in [city]"). Log every send.

- **Day 4 — Second wave + follow-ups.**
  Send the remaining **~15** emails/DMs to hit ~30 contacted. Reply same-day to
  anyone who responds; offer a 10-minute call or a quick live demo.

- **Day 5 — Run demos.**
  Walk interested owners through the **public intake form** (`/u/[slug]`) and the
  **simulator** (`/app/simulator`) using a realistic "no AC" scenario. Show the
  **lead summary** and ask: *"Is this useful? Would you act on it?"*

- **Day 6 — Pricing / willingness-to-pay test (Section 9).**
  Present pricing to anyone who saw a demo. Ask the direct question and record
  the exact words of the answer.

- **Day 7 — Review and decide.**
  Tally against the success/kill metrics (Sections 10–11). Sharpen the message
  for the worst-performing channel. Decide: continue HVAC, or pivot.

---

## 4. The 30-day validation plan (weekly milestones)

- **Week 1 — Reach + first signals.**
  30 businesses contacted, message tested across email + Facebook. Goal: at
  least **5 replies** and **3 demos booked**.

- **Week 2 — Demos + concierge setups.**
  Run demos for everyone who replied. Manually onboard (concierge, $99 setup) up
  to **5 interested businesses**. Get them using the intake form + simulator with
  real scenarios. Goal: **1 paid beta user OR 3 strong "yes" signals**.

- **Week 3 — Usage + value proof.**
  Watch whether beta/concierge owners actually **follow up** on captured leads.
  Collect quotes ("This summary saved me a callback"). Track leads captured per
  business per week. Refine the AI summary based on real feedback.

- **Week 4 — Convert + decide.**
  Turn strong "yes" signals into paid Starter/Pro subscriptions. Write up what
  you learned: best niche message, biggest objection, real willingness to pay.
  Decide whether to scale outreach, change niche, or change the offer.

---

## 5. Concierge / manual (service-assisted) offer

Lead with done-for-you, not software. The exact spirit of the pitch:

> **"I'll set up a simple missed-call recovery flow for your business. When
> someone contacts you, they get a quick intake message, and you get a clean job
> summary. Beta price: $29–$79/month."**

How to deliver it manually:

1. **Set them up for them** using in-app onboarding (the $99 concierge setup).
2. Configure their service categories + intake questions.
3. Have them use the **public intake form** (`/u/[slug]`) and **simulator**
   (`/app/simulator`) with realistic scenarios.
4. Show the **lead summaries** and ask whether they'd act on them.
5. Track whether they actually follow up on captured leads.

This keeps friction near zero for the owner and lets you learn fast.

---

## 6. Cold outreach email template (FOUNDER → prospect)

> **Important:** This is **you, the founder**, reaching out to prospects. It is
> **NOT** the product sending messages. ServiceLead AI itself **never** does cold
> outbound — it only responds to inbound, customer-initiated contact.

```
Subject: Quick question about missed calls at [Business Name]

Hi [First Name],

I came across [Business Name] while looking at HVAC companies in [City].
Quick question — when you're on a job and can't pick up, what happens to
those callers?

I'm working with a few local service businesses on a simple missed-call
recovery setup: when someone calls and you miss it (or fills out your form),
they get an instant intake text, and you get a clean job summary — name,
what they need, urgency — so you can call back fast and not lose the job.

I'll set the whole thing up for you. Beta pricing is $29–$79/month.

Worth a 10-minute look? I can show you a live demo this week.

Thanks,
[Your Name]
[Phone] · [Email]
```

Keep it short, specific, and personalized in the first line.

---

## 7. Facebook DM template

```
Hi [First Name]! Saw [Business Name] does HVAC work around [City].

Quick one — when you miss a call on a job, does that customer usually just
move on to the next company?

I help local service businesses with a simple missed-call recovery flow:
the caller gets an instant intake text and you get a clean job summary so
you can call back fast. I set it up for you, $29–$79/mo for beta.

Open to a quick demo this week?
```

DM etiquette: only message business pages/owners, keep it human, never spam.

---

## 8. Google Maps prospecting instructions

How to find local service businesses to contact:

1. **Search by niche + city.** In Google Maps search "HVAC near [city]" or
   "AC repair [city]". Repeat for nearby towns to widen the list.
2. **Open each listing** and capture: business name, phone number, website,
   and whether a Facebook page is linked.
3. **What to look for (good fit signals):**
   - A real local business (not a national chain or lead-gen aggregator).
   - **A mobile/cell-style number** or a small team — these are the owners most
     likely to be on a job and miss calls.
   - Moderate review count (active, real customers) but **not** a huge enterprise
     with a full call center.
   - A website with a contact form but **no** obvious "24/7 live answering"
     promise (if they already have great phone coverage, they're a worse fit).
4. **What to skip:**
   - Big franchises with dedicated dispatch / answering services.
   - Listings with no phone or no signs of being currently active.
5. **Log everything** in your tracker sheet with a status column (To contact →
   Contacted → Replied → Demo → Decision).

Aim for **30 solid prospects** before you start sending.

---

## 9. Demo script pointer

Use the standalone demo walkthrough: **`docs/DEMO_SCRIPT.md`**.

In short, the demo should show: a realistic missed-call/intake scenario via the
public intake form (`/u/[slug]`) or the simulator (`/app/simulator`), the
instant intake message, and the clean owner **lead summary** (name, need,
urgency, suggested reply). End by asking, *"Would you act on this?"*

---

## 10. Pricing / willingness-to-pay test

Make people commit to a number, not a vibe.

- **Show the real pricing:**
  - **Starter — $29/mo** (50 leads)
  - **Pro — $79/mo** (250 leads)
  - **Growth — $149/mo** (1000 leads)
  - **$99 one-time setup** (the concierge setup you do for them)
- **Ask the direct question:** *"Would you pay $29–$79/month for this?"* Record
  the exact answer.
- **Test commitment, not politeness.** A real "yes" is: agreeing to start a paid
  beta, giving a card for setup, or asking "when can you turn it on?" Vague
  praise ("looks cool") is **not** a yes.
- **Probe the objection.** If they hesitate, ask what would make it a yes —
  price, features, or trust. Log the reason.

---

## 11. Success metrics (first 30 days)

You're on track if you hit:

- **30 businesses contacted**
- **5 replies**
- **3 demos booked**
- **1 paid beta user OR 3 strong "yes" signals**

---

## 12. Kill metrics (stop or pivot)

Pivot the niche, the message, or the offer if you see:

- **Fewer than 2 replies from 50 targeted contacts.**
- Businesses **don't miss enough calls** to care.
- They **already use a strong answering service**.
- They're **unwilling to pay $29/mo**.
- **SMS / compliance setup feels too heavy** for them (or for you to support).

If multiple kill metrics fire, switch niche (plumbers next) or rethink the offer
before spending more on outreach.

---

## 13. Concierge gates (do NOT build until met)

- **Full voice AI** — do not build until **at least 3 paying users** explicitly
  ask for it.
- **Calendar integration** — do not build until manual booking demand is proven
  (owners repeatedly asking to schedule from the app).
- **Multi-channel (WhatsApp, web chat widget, etc.)** — only after SMS + form
  intake is validated.

---

## 14. Functional acceptance checklist

Run on a fresh Supabase project to confirm the MVP works before demos:

- [ ] Sign up and log in (Supabase auth).
- [ ] Complete onboarding → organization is created.
- [ ] Default service categories + intake templates are seeded.
- [ ] Configure a service category and edit its intake questions; changes save.
- [ ] Submit the **public intake form** at `/u/<slug>` → a lead is created.
- [ ] **Mock AI** produces an owner summary + next message + score.
- [ ] Dashboard shows the lead, metrics, and status board.
- [ ] Lead detail shows conversation, AI summary, missing fields, suggested reply.
- [ ] Update lead status (new → contacted → booked); transitions persist.
- [ ] Send an owner email (Resend or console fallback) from the lead.
- [ ] Run the simulator for **missed call**, **SMS**, and **web form**.
- [ ] Text/simulate **STOP** → contact is opted out per phone and further sends
      are blocked across all of their leads and channels.
- [ ] Data is org-scoped: a second account cannot see the first account's leads.

---

## 15. Metrics to watch (once live)

- Leads captured per business per week.
- % of missed calls that reply to the recovery SMS.
- Time-to-first-owner-action on a lead.
- Conversion: lead → contacted → booked → won.
- Trial → paid conversion and churn.

---

*For product scope see `PRD.md`; for the demo walkthrough see `DEMO_SCRIPT.md`;
for compliance see `COMPLIANCE.md`.*
