/** Shared product constants: plans, statuses, sources, default service types. */

export const APP_NAME = "ServiceLead AI";
export const APP_TAGLINE = "Stop losing customers when you miss a call.";

// ── Lead lifecycle ──────────────────────────────────────────────────────────
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "booked",
  "won",
  "lost",
  "spam",
  "archived",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Booked",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
  archived: "Archived",
};

export const LEAD_SOURCES = [
  "missed_call",
  "sms",
  "web_form",
  "manual",
  "test",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  missed_call: "Missed call",
  sms: "SMS",
  web_form: "Web form",
  manual: "Manual",
  test: "Test",
};

export const URGENCY_LEVELS = ["emergency", "high", "medium", "low"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

// Lead-score buckets — single source of truth (used by scoring, the mock AI
// owner-notify decision, and the UI badges) to avoid drift.
export const HOT_LEAD_SCORE_THRESHOLD = 70;
export const WARM_LEAD_SCORE_THRESHOLD = 40;

// ── Billing plans ───────────────────────────────────────────────────────────
export interface Plan {
  id: "starter" | "pro" | "growth";
  name: string;
  price: number;
  cadence: "mo";
  leadCap: number;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    cadence: "mo",
    leadCap: 50,
    features: [
      "Up to 50 recovered leads / mo",
      "Missed-call SMS auto-text",
      "AI lead intake & summaries",
      "Dashboard + lead board",
      "STOP / opt-out handling",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    cadence: "mo",
    leadCap: 250,
    highlighted: true,
    features: [
      "Up to 250 recovered leads / mo",
      "Everything in Starter",
      "Custom intake questions per service",
      "Owner email + SMS alerts",
      "Copyable owner summaries",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    cadence: "mo",
    leadCap: 1000,
    features: [
      "Up to 1,000 recovered leads / mo",
      "Everything in Pro",
      "Multi-user team access",
      "Priority urgent-lead alerts",
      "Advanced reporting",
    ],
  },
];

export const SETUP_FEE = 99; // one-time concierge setup

// ── Default service categories (seeded for new orgs) ────────────────────────
export const DEFAULT_SERVICE_CATEGORIES = [
  { name: "Plumbing repair", description: "Leaks, clogs, water heaters, burst pipes" },
  { name: "HVAC repair", description: "Heating, cooling, AC not working, no heat" },
  { name: "Electrical work", description: "Outages, panel work, outlets, fixtures" },
  { name: "Cleaning quote", description: "Home/office cleaning estimates" },
  { name: "Pest control", description: "Inspections and treatments" },
  { name: "Salon booking", description: "Appointment requests and availability" },
  { name: "Auto repair", description: "Diagnostics, brakes, engine, maintenance" },
  { name: "Auto detailing", description: "Interior/exterior detail, wash, ceramic" },
  { name: "Handyman service", description: "Small repairs, installs, odd jobs" },
  { name: "Custom", description: "General service inquiry" },
] as const;

// Reasonable default intake questions reused across categories.
export const DEFAULT_INTAKE_QUESTIONS = [
  { key: "service_needed", label: "What service do you need?", required: true },
  { key: "urgency", label: "Is it urgent or an emergency?", required: true },
  { key: "address", label: "What is the address or ZIP code?", required: false },
  { key: "issue", label: "Can you describe the issue?", required: true },
  { key: "photo", label: "Can you send a photo? (placeholder)", required: false },
  { key: "preferred_time", label: "What time works best for you?", required: false },
  {
    key: "property_type",
    label: "Is this residential or commercial?",
    required: false,
  },
] as const;

export const STOP_KEYWORDS = [
  "stop",
  "stopall",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
];

// Standard carrier resubscribe keywords. Intentionally excludes "yes" so a
// normal mid-conversation reply ("yes, it's urgent") is not read as opt-in.
export const START_KEYWORDS = ["start", "unstop"];
