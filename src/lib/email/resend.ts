import { env, isResendConfigured } from "@/lib/env";

/**
 * Owner email notifications via Resend. If RESEND_API_KEY is missing we log the
 * email to the console (and the caller records it on the dashboard) instead of
 * failing. The `resend` package is an optional dependency loaded lazily.
 */

export interface OwnerLeadEmail {
  to: string;
  businessName: string;
  appUrl: string;
  leadId: string;
  serviceNeeded: string | null;
  urgency: string | null;
  customerPhone: string | null;
  customerName: string | null;
  address: string | null;
  summary: string;
  recommendedNextStep: string;
}

export interface SendEmailResult {
  delivered: boolean;
  via: "resend" | "console";
  id?: string;
  error?: string;
}

function renderHtml(p: OwnerLeadEmail): string {
  const leadUrl = `${p.appUrl}/app/leads/${p.leadId}`;
  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#0a8f50;margin-bottom:4px">New lead — ${escapeHtml(p.businessName)}</h2>
    <p style="color:#555;margin-top:0">A customer just reached out. Here's the summary:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row("Service", p.serviceNeeded)}
      ${row("Urgency", p.urgency)}
      ${row("Name", p.customerName)}
      ${row("Phone", p.customerPhone)}
      ${row("Address", p.address)}
    </table>
    <pre style="background:#f6f8f7;padding:12px;border-radius:8px;white-space:pre-wrap;font-family:inherit">${escapeHtml(p.summary)}</pre>
    <p style="font-weight:600">Recommended next step: ${escapeHtml(p.recommendedNextStep)}</p>
    <a href="${leadUrl}" style="display:inline-block;background:#16b364;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View lead</a>
    <p style="color:#999;font-size:12px;margin-top:24px">You're receiving this because you enabled lead notifications in ServiceLead AI.</p>
  </div>`;
}

function row(label: string, value: string | null): string {
  if (!value) return "";
  return `<tr><td style="padding:4px 8px;color:#888">${label}</td><td style="padding:4px 8px;font-weight:600">${escapeHtml(value)}</td></tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendOwnerLeadEmail(
  payload: OwnerLeadEmail,
): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    console.info(
      `[email:console] Owner notification for lead ${payload.leadId} -> ${payload.to}\n${payload.summary}`,
    );
    return { delivered: false, via: "console" };
  }

  try {
    // Lazy import so the app builds without the optional dependency.
    const { Resend } = await import("resend");
    const resend = new Resend(env.resend.apiKey);
    const { data, error } = await resend.emails.send({
      from: env.resend.fromEmail,
      to: payload.to,
      subject: `New ${payload.urgency ?? ""} lead: ${payload.serviceNeeded ?? "service request"}`.trim(),
      html: renderHtml(payload),
    });
    if (error) return { delivered: false, via: "resend", error: String(error) };
    return { delivered: true, via: "resend", id: data?.id };
  } catch (err) {
    console.error("[email] Resend send failed", err);
    return {
      delivered: false,
      via: "resend",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
