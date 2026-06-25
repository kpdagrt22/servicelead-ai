import { cn } from "@/lib/utils";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "@/lib/constants";
import { scoreLabel } from "@/lib/leads/scoring";

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  booked: "bg-purple-100 text-purple-700",
  won: "bg-brand-100 text-brand-700",
  lost: "bg-gray-200 text-gray-600",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Pill className={STATUS_STYLES[status] ?? STATUS_STYLES.new}>
      {LEAD_STATUS_LABELS[status] ?? status}
    </Pill>
  );
}

const URGENCY_STYLES: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-600",
};

export function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;
  return (
    <Pill className={URGENCY_STYLES[urgency] ?? URGENCY_STYLES.low}>
      {urgency === "emergency" ? "🚨 " : ""}
      {urgency}
    </Pill>
  );
}

export function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <Pill className="bg-gray-100 text-gray-600">
      {LEAD_SOURCE_LABELS[source] ?? source}
    </Pill>
  );
}

const SCORE_STYLES = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-gray-100 text-gray-500",
} as const;

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const label = scoreLabel(score);
  return (
    <Pill className={SCORE_STYLES[label]}>
      {score} · {label}
    </Pill>
  );
}
