import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ScoreBadge,
  SourceBadge,
  StatusBadge,
  UrgencyBadge,
} from "@/components/ui/badges";
import { CopyButton } from "@/components/app/copy-button";
import { isResendConfigured, isTwilioConfigured } from "@/lib/env";
import { nextStatuses } from "@/lib/leads/status";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type {
  AiIntakeLog,
  Appointment,
  Lead,
  Message,
} from "@/types/database";
import {
  bookAppointmentAction,
  saveOwnerNotesAction,
  sendOwnerEmailAction,
  sendReplyAction,
  updateLeadStatusAction,
} from "./actions";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrg();
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();

  if (!lead) notFound();
  const l = lead as Lead;

  const [{ data: messages }, { data: conv }, { data: logs }, { data: appts }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("conversations")
        .select("id")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_intake_logs")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("appointments")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const thread = (messages ?? []) as Message[];
  const conversationId = conv?.id as string | undefined;
  const latestLog = (logs?.[0] as AiIntakeLog | undefined) ?? undefined;
  const aiOut = (latestLog?.output_json ?? {}) as {
    missing_fields?: string[];
    risk_flags?: string[];
    next_message_to_customer?: string | null;
    confidence?: number;
  };
  const appointments = (appts ?? []) as Appointment[];

  return (
    <div className="space-y-6">
      <Link href="/app/leads" className="text-sm text-brand-600">
        ← Back to leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {l.customer_name || l.customer_phone || "Unknown caller"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />
            <UrgencyBadge urgency={l.urgency} />
            <ScoreBadge score={l.lead_score} />
            <SourceBadge source={l.source} />
            {l.opt_out && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                Opted out
              </span>
            )}
          </div>
        </div>
        {l.ai_summary && <CopyButton text={l.ai_summary} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left/main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI summary */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">AI summary</h2>
              <form action={sendOwnerEmailAction}>
                <input type="hidden" name="leadId" value={l.id} />
                <button type="submit" className="btn-ghost text-xs">
                  ✉ Send owner email
                </button>
              </form>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-sans text-sm text-gray-700">
              {l.ai_summary || "No AI summary yet."}
            </pre>
            {!isResendConfigured() && (
              <p className="mt-2 text-xs text-gray-400">
                Resend isn't configured — owner emails are logged to the server
                console instead of sent.
              </p>
            )}
          </section>

          {/* Conversation */}
          <section className="card p-5">
            <h2 className="font-semibold">Conversation</h2>
            <div className="mt-4 space-y-3">
              {thread.length === 0 && (
                <p className="text-sm text-gray-400">No messages yet.</p>
              )}
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.direction === "inbound"
                      ? "flex justify-start"
                      : "flex justify-end"
                  }
                >
                  <div
                    className={
                      m.direction === "inbound"
                        ? "max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-sm text-gray-800"
                        : "max-w-[80%] rounded-2xl rounded-br-sm bg-brand-500 px-3 py-2 text-sm text-white"
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p
                      className={
                        m.direction === "inbound"
                          ? "mt-1 text-[10px] text-gray-400"
                          : "mt-1 text-[10px] text-brand-100"
                      }
                    >
                      {m.ai_generated ? "AI · " : ""}
                      {m.status ? `${m.status} · ` : ""}
                      {formatRelativeTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <form action={sendReplyAction} className="mt-4 border-t border-gray-100 pt-4">
              <input type="hidden" name="leadId" value={l.id} />
              <input type="hidden" name="conversationId" value={conversationId ?? ""} />
              {aiOut.next_message_to_customer && (
                <div className="mb-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
                  <span className="font-semibold">Suggested reply:</span>{" "}
                  {aiOut.next_message_to_customer}
                </div>
              )}
              <textarea
                name="body"
                rows={3}
                className="input"
                placeholder={
                  l.opt_out
                    ? "This customer has opted out — messaging is disabled."
                    : "Type a reply to the customer…"
                }
                disabled={l.opt_out}
                defaultValue={aiOut.next_message_to_customer ?? ""}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {isTwilioConfigured()
                    ? "Sends via Twilio SMS."
                    : "Twilio not configured — message is saved & simulated."}
                </p>
                <button type="submit" className="btn-primary text-sm" disabled={l.opt_out}>
                  Send reply
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer details */}
          <section className="card p-5">
            <h2 className="font-semibold">Customer details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Detail label="Phone" value={l.customer_phone} />
              <Detail label="Email" value={l.customer_email} />
              <Detail label="Service" value={l.service_needed} />
              <Detail label="Urgency" value={l.urgency} />
              <Detail label="Address" value={l.address} />
              <Detail label="Preferred time" value={l.preferred_time} />
              <Detail label="Consent" value={l.consent_status} />
              <Detail label="Source" value={l.source} />
            </dl>
          </section>

          {/* Status updates */}
          <section className="card p-5">
            <h2 className="font-semibold">Update status</h2>
            <form action={updateLeadStatusAction} className="mt-3 flex gap-2">
              <input type="hidden" name="leadId" value={l.id} />
              <select name="status" className="input" defaultValue={l.status}>
                <option value={l.status}>
                  {LEAD_STATUS_LABELS[l.status]} (current)
                </option>
                {nextStatuses(l.status).map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondary text-sm">
                Update
              </button>
            </form>
          </section>

          {/* AI signals */}
          {(aiOut.missing_fields?.length || aiOut.risk_flags?.length) && (
            <section className="card p-5">
              <h2 className="font-semibold">AI signals</h2>
              {aiOut.missing_fields && aiOut.missing_fields.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500">Missing info</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {aiOut.missing_fields.map((m) => (
                      <span
                        key={m}
                        className="rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {aiOut.risk_flags && aiOut.risk_flags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500">Risk flags</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {aiOut.risk_flags.map((m) => (
                      <span
                        key={m}
                        className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Book appointment */}
          <section className="card p-5">
            <h2 className="font-semibold">Book appointment</h2>
            <form action={bookAppointmentAction} className="mt-3 space-y-2">
              <input type="hidden" name="leadId" value={l.id} />
              <input type="datetime-local" name="scheduledFor" className="input" />
              <input name="notes" className="input" placeholder="Notes (optional)" />
              <button type="submit" className="btn-secondary w-full text-sm">
                Book / request appointment
              </button>
            </form>
            {ctx.organization.booking_link && (
              <a
                href={ctx.organization.booking_link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-xs text-brand-600"
              >
                Open external booking link →
              </a>
            )}
            {appointments.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-gray-500">
                {appointments.map((a) => (
                  <li key={a.id}>
                    {a.scheduled_for
                      ? new Date(a.scheduled_for).toLocaleString()
                      : "Time TBD"}{" "}
                    · {a.status}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Owner notes */}
          <section className="card p-5">
            <h2 className="font-semibold">Owner notes</h2>
            <form action={saveOwnerNotesAction} className="mt-3 space-y-2">
              <input type="hidden" name="leadId" value={l.id} />
              <textarea
                name="notes"
                rows={4}
                className="input"
                defaultValue={l.owner_notes ?? ""}
                placeholder="Private notes for your team…"
              />
              <button type="submit" className="btn-secondary w-full text-sm">
                Save notes
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value || "—"}</dd>
    </div>
  );
}
