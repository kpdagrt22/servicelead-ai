# Twilio setup

Twilio is **optional**. ServiceLead AI runs fully without it via the in-app
simulator and the public intake form. When you're ready for real SMS and
missed-call recovery, follow this guide.

## How it behaves without Twilio

- Outbound sends are **simulated** (logged to the server console) — see
  [`src/lib/twilio/client.ts`](../src/lib/twilio/client.ts).
- Inbound is exercised through `/app/simulator`.
- The lead detail "Send reply" still stores the message with `status="simulated"`.

## 1. Get Twilio credentials

From the [Twilio Console](https://console.twilio.com):

- **Account SID** and **Auth Token**
- A **phone number** with SMS capability, or a **Messaging Service SID**

Set in `.env.local` (or your host's env):

```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx   # optional but recommended
TWILIO_PHONE_NUMBER=+15550100000          # used if no messaging service
TWILIO_VALIDATE_SIGNATURE=true            # set false only for local testing
```

Twilio is considered "configured" when `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
plus either a messaging service or phone number are present.

## 2. Register your number in-app

In **Settings → Configure SMS**, enter your Twilio number. This writes a
`twilio_numbers` row that routes inbound webhooks to your organization. (If only
one org exists, inbound falls back to it automatically.)

## 3. Configure webhooks

Point Twilio at your deployed app (use your production `NEXT_PUBLIC_APP_URL`; for
local testing use an [ngrok](https://ngrok.com) tunnel).

| Event | Method | URL |
| --- | --- | --- |
| Incoming SMS (number or Messaging Service "Inbound") | POST | `https://<app>/api/twilio/sms/inbound` |
| Message status callback | POST | `https://<app>/api/twilio/sms/status` |
| Voice — missed/unanswered call | POST | `https://<app>/api/twilio/voice/missed-call-placeholder` |

These URLs are also shown on the **Settings** page for your environment.

> **Security — fails closed in production.** All three webhooks validate the
> `X-Twilio-Signature`. If `TWILIO_AUTH_TOKEN` is unset, or the signature is
> missing/invalid, the route returns `403` instead of touching the
> RLS-bypassing service-role client — protecting the only tenant from forged
> inbound. `TWILIO_VALIDATE_SIGNATURE=false` disables checks **only outside**
> production (local dev / tunnels); it is ignored when `NODE_ENV=production`, so
> `TWILIO_AUTH_TOKEN` must be set for these endpoints to accept any traffic in
> production.

### Inbound SMS — `/api/twilio/sms/inbound`

- Validates the `X-Twilio-Signature` (toggle with `TWILIO_VALIDATE_SIGNATURE`).
- Routes by the receiving number (`To`) → org.
- Runs `processIntake`, which handles **STOP/START** before anything else.
- Replies with **TwiML** containing the AI's next message (Twilio sends it).
- Rate-limited per sender as a basic flood guard.

### Status callback — `/api/twilio/sms/status`

Updates the matching `messages` row by `provider_message_id` with the delivery
status (`queued`/`sent`/`delivered`/`failed`/`undelivered`).

### Missed call (voice) — `/api/twilio/voice/missed-call-placeholder`

v1 does **not** build a voice receptionist. Recommended setup:

- Forward unanswered calls to voicemail and set this URL as the voice/no-answer
  webhook, **or** use a Twilio **Studio Flow** that calls this endpoint when a
  call goes unanswered.
- On invocation it creates a `missed_call` lead, sends the **first recovery SMS**
  to the caller, and returns short TwiML ("Sorry we missed your call — we just
  texted you").

## 4. STOP / opt-out compliance

Opt-out is handled in [`src/lib/twilio/optout.ts`](../src/lib/twilio/optout.ts)
and enforced in `processIntake`:

- First-word **STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT** →
  `leads.opt_out = true`, confirmation sent, AI does not run.
- **START / YES / UNSTOP** → re-subscribe.
- The app **never** sends to an opted-out number (`canSendSms()` guard).
- A `Reply STOP to opt out.` footer is appended to outbound messages.

> Twilio's carrier-level Advanced Opt-Out may also auto-handle STOP. The app's
> handling is defensive and idempotent either way.

## 5. Test it

1. Local: run `ngrok http 3000`, set the webhook URLs to the ngrok URL.
2. Text your Twilio number → you should get the AI's reply and see the lead in
   the dashboard.
3. Text `STOP` → you should be marked opted out and get no further messages.
4. Text `START` → re-subscribed.

## Troubleshooting

- **403 Invalid signature** — the public URL Twilio calls must exactly match
  `NEXT_PUBLIC_APP_URL` + path. For quick local tests set
  `TWILIO_VALIDATE_SIGNATURE=false`.
- **No reply** — confirm a `twilio_numbers` row maps `To` to your org (or that
  only one org exists).
- **Nothing sent** — check the server logs for `[twilio:simulated]`, which means
  Twilio env vars aren't set.
