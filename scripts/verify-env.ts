/**
 * Environment verification for ServiceLead AI.
 *
 *   npm run verify:env
 *
 * Prints which integrations are configured WITHOUT ever printing secret values.
 * Exits non-zero only when a variable that is *required for the selected mode*
 * is missing — optional integrations only produce warnings. Useful both locally
 * and as a pre-deploy check.
 */
import { loadEnvConfig } from "@next/env";

// Load .env / .env.local exactly like Next.js does.
loadEnvConfig(process.cwd());

type Status = "set" | "missing";
const isSet = (name: string): Status =>
  process.env[name] && process.env[name]!.trim() !== "" ? "set" : "missing";

const mark = (s: Status) => (s === "set" ? "✓ set" : "· missing");

const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

interface Check {
  name: string;
  required: boolean;
  note?: string;
}

interface Group {
  title: string;
  optional: boolean;
  checks: Check[];
}

const groups: Group[] = [
  {
    title: "Supabase (required for auth, dashboard, intake)",
    optional: false,
    checks: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", required: true },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        required: true,
        note: "server-only; needed for public intake + webhooks",
      },
    ],
  },
  {
    title: `AI (provider = ${provider})`,
    optional: false,
    checks: [
      { name: "AI_PROVIDER", required: false, note: "defaults to mock" },
      {
        name: "OPENAI_API_KEY",
        required: provider === "openai",
        note: provider === "openai" ? "required for openai" : "optional",
      },
      {
        name: "ANTHROPIC_API_KEY",
        required: provider === "anthropic",
        note: provider === "anthropic" ? "required for anthropic" : "optional",
      },
    ],
  },
  {
    title: "Twilio (optional — SMS; simulated if absent)",
    optional: true,
    checks: [
      { name: "TWILIO_ACCOUNT_SID", required: false },
      { name: "TWILIO_AUTH_TOKEN", required: false },
      { name: "TWILIO_MESSAGING_SERVICE_SID", required: false },
      { name: "TWILIO_PHONE_NUMBER", required: false },
    ],
  },
  {
    title: "Email (optional — owner notifications; console fallback)",
    optional: true,
    checks: [
      { name: "RESEND_API_KEY", required: false },
      { name: "FROM_EMAIL", required: false },
    ],
  },
  {
    title: "Stripe (optional — billing; trial mode if absent)",
    optional: true,
    checks: [
      { name: "STRIPE_SECRET_KEY", required: false },
      { name: "STRIPE_WEBHOOK_SECRET", required: false },
      { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", required: false },
      { name: "NEXT_PUBLIC_STRIPE_PRICE_STARTER", required: false },
      { name: "NEXT_PUBLIC_STRIPE_PRICE_PRO", required: false },
      { name: "NEXT_PUBLIC_STRIPE_PRICE_GROWTH", required: false },
    ],
  },
  {
    title: "App",
    optional: true,
    checks: [
      { name: "NEXT_PUBLIC_APP_URL", required: false, note: "defaults to localhost" },
      { name: "ADMIN_EMAILS", required: false, note: "comma-separated allowlist" },
    ],
  },
];

let missingRequired = 0;
let warnings = 0;

console.log("\nServiceLead AI — environment check\n");

for (const group of groups) {
  console.log(`▸ ${group.title}`);
  for (const check of group.checks) {
    const status = isSet(check.name);
    const tag = check.required ? "[required]" : "[optional]";
    const note = check.note ? `  — ${check.note}` : "";
    console.log(`   ${mark(status)}  ${check.name} ${tag}${note}`);
    if (status === "missing" && check.required) missingRequired++;
    if (status === "missing" && group.optional === false && !check.required) {
      // non-required item in a required group (e.g. AI keys when on mock): no-op
    }
    if (status === "missing" && group.optional) warnings++;
  }
  console.log("");
}

if (missingRequired > 0) {
  console.error(
    `✗ ${missingRequired} required variable(s) missing for mode "${provider}". See above.\n`,
  );
  process.exit(1);
}

console.log(
  `✓ All required variables are set. (${warnings} optional integration var(s) not configured — that's fine.)\n`,
);
process.exit(0);
