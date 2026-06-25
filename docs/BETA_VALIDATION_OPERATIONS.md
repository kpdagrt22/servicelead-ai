# ServiceLead AI — Beta Validation Operations Kit

A founder-facing, copy-paste-ready playbook for landing the first paying beta users.

ServiceLead AI is inbound missed-call recovery + AI lead-intake for local service
businesses. It texts missed callers, collects job details, scores urgency, and sends
the owner a clean lead summary.

What it is NOT: not cold outbound, not a CRM, not a voice receptionist, not medical triage.

Pricing reference:
- Starter — $29/mo (50 leads)
- Pro — $79/mo (250 leads)
- Growth — $149/mo (1000 leads)
- Setup — $99 one-time

---

## 1. Target Niche Recommendation

**Primary: HVAC.** Secondary: **Plumbers.** Third: **Electricians.**

Why these three, in priority order:

- **HVAC (primary).**
  - High lead value: a single install/repair ticket is often $300–$8,000, so one
    recovered call pays for the tool many times over.
  - Urgent customer need: no heat in winter / no AC in a heat wave = the caller will
    call the next company in 60 seconds if you don't respond.
  - Missed calls really matter: techs are on rooftops and in crawlspaces all day and
    physically cannot answer. They feel the lost revenue.
  - Simple workflow: name, address, "what's broken," urgency. Maps cleanly to our intake.
  - Willingness to pay: owners already spend on Google Ads/trucks/marketing and
    understand cost-per-lead, so $29–$79/mo is an easy yes if it recovers one job.

- **Plumbers (secondary).**
  - Same urgency dynamic (burst pipe, no hot water, sewage backup = emergency).
  - Solo and small-shop operators are common and hands-on, so they own the buying decision.
  - Average job value is high enough that one saved lead covers months of subscription.

- **Electricians (third).**
  - Good lead value and real urgency (power out, panel issues, safety concerns).
  - Slightly less "drop-everything emergency" volume than HVAC/plumbing on average, which
    is why they're third — still a strong fit, just a thinner urgency tail.

Common thread: small/owner-operated, on jobs during the day, high-value urgent leads,
and they already feel the pain of the missed call. That's the wedge.

---

## 2. Prospecting List Method

Goal: build a list of 50–100 owner-operated shops with a visible phone number.

### Google Maps / Google search strings
Paste these into Google Maps (swap the city for your target metros):
- `HVAC repair Dallas owner operated`
- `AC repair Phoenix small business`
- `emergency plumber Austin`
- `electrician near Tampa`
- `heating and cooling near me owner operated`
- `24 hour plumber [city]`
- `residential electrician small business [city]`

For each result, capture: business name, phone, website, review count, and whether it
looks like a solo/small shop vs. a big franchise.

### Facebook group search strings
Search Facebook (groups + posts) for:
- `HVAC business owners`
- `plumbing business owners group`
- `electrician business owners`
- `[city] small business owners`
- `home service business owners`
- `trades business marketing`
Look for active solo operators posting in these groups — they're approachable and vocal
about pain points.

### Yelp / directory search strings
- Yelp: `HVAC [city]`, `plumbers [city]`, `electricians [city]` — filter by "Request a Quote"
  enabled and by businesses with a phone listed.
- Angi / Thumbtack / HomeAdvisor: search the same three trades by city; note who responds
  fast vs. slow (slow responders are your best prospects).
- Nextdoor: "Recommendations" for local trades surfaces small operators neighbors use.

### Local chamber / directory ideas
- Local Chamber of Commerce member directory (filter by trade category).
- BBB accredited business listings by category and city.
- Local "Best of [City]" small business award lists.
- Facebook Marketplace / community boards where trades advertise services.
- Trade association local chapters (e.g., regional HVAC/plumbing contractor associations).

---

## 3. Qualification Criteria

### Good beta prospect (pursue)
- Small business, ideally 1–10 people.
- Owner answers the phone personally (or wishes they could).
- Has reviews (shows they take customers — and that customers try to reach them).
- Phone number is publicly visible on Google/Yelp/website.
- Offers emergency or urgent service.
- Likely misses calls while on jobs / driving / under a sink or on a roof.
- NOT a large call center operation.

### Bad beta prospect (skip)
- Franchise or chain with a dedicated call center / dispatch team.
- No public phone number (you can't even prove they miss calls).
- Too large / enterprise — long procurement, not the buyer you can move fast with.
- Regulated healthcare / emergency-medical use (out of scope — this is not triage).
- No urgency and low lead value (e.g., low-ticket, non-time-sensitive services).

Quick filter: "Small + owner-driven + urgent + visible phone = call them. Big + call
center + no phone + not urgent = skip."

---

## 4. Outreach Scripts

> Reminder: this outreach is YOU, the founder, contacting prospects directly. The
> ServiceLead AI product itself never does cold outbound — it only responds to people who
> already called the business and got a missed call.

### Cold email (verbatim)

```
Subject: Quick question about missed service calls

Hi [First Name],

Quick question — when you're out on a job and a call comes in that you can't pick up,
what happens to that lead right now?

I'm building a simple missed-call recovery tool for [HVAC/plumbing/electrical] businesses.
When you miss a call, it automatically texts the caller, asks a few quick questions to
collect the job details, and then sends you one clean summary of the lead — name, what
they need, and how urgent it is. No app for the customer, just a text.

It's not a call center and it's not a robot receptionist — just a simple way to stop
losing the calls you can't answer.

I'm onboarding the first few beta businesses by hand and would set it up for you myself.
Open to a 10-minute demo this week?

Thanks,
[Your Name]
[Phone] | ServiceLead AI
```

### Facebook DM (verbatim)

```
Hey [First Name] — saw your shop in [group/area]. Quick one: do you ever miss calls when
you're out on a job?

I built a simple little tool that texts back the people you miss, asks them what they need,
and sends you a clean summary so you're not chasing voicemails. Not a call center, nothing
fancy.

I'm looking for 3–5 beta businesses to try it (I'll set it up for you). Want me to show
you how it works real quick?
```

### Phone script (verbatim)

```
"Hi, is this [Owner Name]? Great — I'll keep this to 30 seconds.

I work with [HVAC/plumbing/electrical] shops on missed calls. When you're on a job and
can't answer, the lead usually just disappears. I built a simple tool that automatically
texts those callers, asks what they need, and sends you one clean lead summary.

Just to be clear — this isn't a call center and it isn't an answering service trying to
sound like a person. It's a simple text-based intake flow that runs in the background.

Can I text or email you a quick demo link so you can see exactly what the caller sees and
what lands in your inbox?"
```

---

## 5. Demo Script

Run this live using the app. Detailed step-by-step is in `docs/DEMO_SCRIPT.md`.

- **Open the dashboard** (`/app`) — "This is your home base; every recovered lead shows up here."
- **Show service categories** (`/app/intake`) — "We tailor the questions to your trade so the
  intake matches HVAC vs. plumbing vs. electrical."
- **Run the simulator** (`/app/simulator`) — "Let's pretend a customer just called and you
  missed it. Watch what happens." Walk through the auto-text and the back-and-forth that
  collects job details.
- **Show the lead summary** — "Here's what you get: name, contact, the job, all in one clean
  card. No digging through voicemail."
- **Show the urgency score** — "We flag how urgent it is so you know who to call back first —
  the no-heat emergency jumps the line over a routine quote."
- **Show the public intake form** (`/u/[slug]`) — "This is your shareable link/QR. You can
  put it on your truck, your Google profile, or text it out manually too."
- **Show opt-out** — "Customers can opt out of texts anytime, so you stay compliant and
  respectful."
- **Explain owner notification** — "The second a lead is captured, you get notified with the
  summary — so you can call back while they're still deciding."

Close: "I'll set this up for you by hand as one of our first beta businesses."

For the full word-for-word flow, see `docs/DEMO_SCRIPT.md`.

---

## 6. Beta Offer

Options to present:
- **$29/month beta** — simplest, low-friction commitment.
- **$99 setup + first month included** — you do the setup, they get month one inside the fee.
- **Free 7-day pilot** — zero-risk trial to remove all objections.

**Recommended: charge something early.**

> "It's $29/month during the beta. I'll set it up for you manually so you don't have to
> do anything — you just start getting the leads."

Why charge: a paid yes (even $29) is real validation. Free pilots attract people who never
intended to buy. Charging early tells you whether the pain is worth money — which is the
entire point of this beta.

---

## 7. Discovery Questions to Ask

Work these into the demo or a quick call:

1. How many calls would you say you miss in a typical week?
2. What happens right now when you miss a call?
3. Do customers text you today, or is it mostly phone calls?
4. Do you use an answering service or a receptionist?
5. What's your average job value?
6. Would a clean lead summary — name, job, urgency in one place — actually help you?
7. Would you pay $29–$79/month for something that recovered those missed calls?
8. What would make this useless for you?
9. What would make this a no-brainer / instant yes?

Listen more than you pitch. Questions 8 and 9 are gold — they tell you exactly what to
build and how to sell.

---

## 8. Success Metrics

### First 7 days
- 30 prospects contacted
- 5 replies
- 3 demos booked
- 1 paid beta user **OR** 3 strong verbal "yes"

### First 30 days
- 100 prospects contacted
- 15 replies
- 8 demos
- 3 paid beta users
- At least 1 user retained past 14 days

Track these in a simple sheet: Contacted, Replied, Demoed, Paid, Retained.

---

## 9. Kill Metrics (when to stop or pivot)

Pull the plug or seriously rethink the approach if:
- Fewer than 2 replies from 50 targeted contacts (the message/market isn't landing).
- No one reports missing meaningful calls (no pain = no product).
- They all already use answering services and are happy with them.
- No one is willing to pay even $29/month.
- The SMS setup / texting process scares everyone away.
- The only thing prospects actually want is a full voice receptionist (different product).

If two or more of these hit hard, the wedge is wrong — change niche, message, or product
before spending more time.

---

## 10. Feedback Form

Paste these fields into a Google Form or Notion to capture every demo/beta conversation:

1. **Business name** — short text
2. **Industry** — HVAC / Plumbing / Electrical / Other
3. **Weekly missed calls (estimate)** — number
4. **Average job value** — number / range
5. **Current solution** — what they do today when they miss a call (short text)
6. **Demo usefulness (1–10)** — rating
7. **Would you pay?** — Yes / No / Maybe
8. **Price comfort** — what monthly price feels fair ($29 / $79 / $149 / other)
9. **Missing feature** — what would make this a must-have? (short text)
10. **Main objection** — the #1 reason they'd say no (short text)

Review responses weekly. Patterns in "Missing feature" and "Main objection" drive the
roadmap; "Would you pay" + "Price comfort" validate the business.
