# Database

ServiceLead AI uses Supabase Postgres with Row Level Security. Schema lives in
[`supabase/migrations`](../supabase/migrations) and is applied in order:

1. `0001_init.sql` — tables + indexes
2. `0002_rls.sql` — RLS policies + `is_org_member()` helper
3. `0003_triggers.sql` — profile/org triggers + default seeding
4. `0004_subscriptions_unique.sql` — one subscription row per organization
   (backs the Stripe webhook upsert)

TypeScript types mirroring the schema are hand-maintained in
[`src/types/database.ts`](../src/types/database.ts). You can regenerate them with
`supabase gen types typescript`.

## Entity overview

```
auth.users ──1:1── profiles ──1:N── organizations ──┬─ organization_members
                                                     ├─ service_categories ──1:N── intake_templates
                                                     ├─ leads ──┬─ conversations ──1:N── messages
                                                     │          ├─ appointments
                                                     │          └─ ai_intake_logs
                                                     ├─ twilio_numbers
                                                     └─ subscriptions
```

Every tenant table carries `organization_id` so RLS and queries are uniformly
org-scoped.

## Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | One row per auth user | `id` (=auth.uid), `full_name`, `email` |
| `organizations` | The business/tenant | `owner_id`, `name`, `slug` (unique, used for `/u/[slug]`), `timezone`, `notification_email`, `notification_phone`, `booking_link`, `review_link`, `business_hours` (jsonb), `emergency_service`, `sms_consent`, `onboarded` |
| `organization_members` | Membership + role | `organization_id`, `user_id`, `role` (`owner`/`admin`/`member`) |
| `service_categories` | What the business offers | `name`, `active` |
| `intake_templates` | Questions per category | `service_category_id`, `questions` (jsonb array of `{key,label,required}`) |
| `leads` | A captured customer | `source` (`missed_call`/`sms`/`web_form`/`manual`/`test`), `customer_*`, `service_needed`, `urgency`, `address`, `status` (`new`/`contacted`/`booked`/`won`/`lost`), `lead_score`, `ai_summary`, `owner_notes`, `consent_status`, `consent_source`, `opt_out` |
| `conversations` | Thread per lead/channel | `lead_id`, `channel` (`sms`/`web`/`manual`), `status`, `last_message_at` |
| `messages` | Individual messages | `direction` (`inbound`/`outbound`), `body`, `from_number`, `to_number`, `provider_message_id`, `ai_generated`, `status` |
| `twilio_numbers` | Number → org routing | `phone_number`, `twilio_sid`, `status` |
| `appointments` | Booking requests | `lead_id`, `scheduled_for`, `status`, `notes` |
| `ai_intake_logs` | Audit of AI runs | `provider`, `model`, `input_json`, `output_json`, `status` (`ok`/`fallback`), `error_message` |
| `subscriptions` | Stripe billing state | `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end` |

> The schema adds a few fields beyond the original spec that the product needs:
> `organizations.slug` (public intake URL), `review_link`, `default_response_delay`,
> `sms_consent`, `onboarded`; and `leads.consent_source`. These are additive.

## Row Level Security

RLS is enabled on **every** table. The core rule: **a user can access only the
organizations they own or are a member of**, and all tenant data is scoped to
those orgs.

A `SECURITY DEFINER` helper avoids recursive policy evaluation:

```sql
create function public.is_org_member(org_id uuid) returns boolean ...
  -- true if auth.uid() owns org_id OR is in organization_members for org_id
```

Policy summary:

- **profiles** — a user can select/insert/update only their own row.
- **organizations** — members can `select`; only the **owner** can
  insert/update/delete.
- **organization_members** — members can `select`; only the **owner** can manage.
- **service_categories, intake_templates, leads, conversations, messages,
  twilio_numbers, appointments** — full access (`for all`) to org **members**.
- **ai_intake_logs, subscriptions** — members get **read-only**; writes happen
  via the **service role** (webhooks / public intake), which **bypasses RLS**.

### Service role boundary

The service-role client ([`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts))
bypasses RLS and is used **only** in trusted server contexts that cannot run as a
user:

- `POST /api/intake` (public web form)
- `POST /api/twilio/*` (webhooks)
- the in-app simulator action (so it can write `ai_intake_logs`)

It is never imported into client components.

## Triggers & automation (`0003_triggers.sql`)

- **`handle_new_user`** (on `auth.users` insert) → creates the `profiles` row.
- **`handle_new_organization`** (on `organizations` insert) → adds the owner as
  an `owner` member and **seeds 7 default service categories**, each with a
  default intake template.
- **`set_updated_at`** → maintains `updated_at` on mutable tables.
- **`touch_conversation`** (on `messages` insert) → updates
  `conversations.last_message_at`.

## RLS test assumptions (documented)

These invariants are assumed by the app and should hold under the policies above
(verify against your Supabase project):

1. User A cannot `select` or `update` User B's leads/messages/conversations.
2. A non-owner member cannot insert/update an organization row.
3. Anonymous (anon key) reads of `organizations`/`leads` return nothing — which
   is why the **public intake page uses the service role** to look up the org by
   slug.
4. `ai_intake_logs` cannot be inserted by a normal member (only read) — the
   simulator therefore uses the service-role client.

See [`docs/VALIDATION_PLAN.md`](VALIDATION_PLAN.md) for how to manually verify
these.
