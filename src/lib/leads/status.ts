import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/constants";

export type { LeadStatus };

/**
 * Allowed lead status transitions. Permissive enough for a busy owner (a lead
 * can jump straight to "won"), but blocks nonsensical moves and supports the
 * full lifecycle including spam and archival.
 */
const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "booked", "won", "lost", "spam", "archived"],
  contacted: ["booked", "won", "lost", "new", "spam", "archived"],
  booked: ["won", "lost", "contacted", "archived"],
  won: ["lost", "archived"],
  lost: ["new", "contacted", "archived"],
  spam: ["new", "archived"],
  archived: ["new", "contacted"],
};

export function canTransitionLeadStatus(
  from: LeadStatus,
  to: LeadStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Back-compat alias used by existing server actions. */
export const canTransition = canTransitionLeadStatus;

export function nextStatuses(from: LeadStatus): LeadStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function getLeadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

/** Semantic badge variant for a status (consumed by the UI badge component). */
export type LeadStatusBadgeVariant =
  | "info"
  | "warning"
  | "purple"
  | "success"
  | "neutral"
  | "danger";

export function getLeadStatusBadgeVariant(
  status: LeadStatus,
): LeadStatusBadgeVariant {
  switch (status) {
    case "new":
      return "info";
    case "contacted":
      return "warning";
    case "booked":
      return "purple";
    case "won":
      return "success";
    case "lost":
      return "danger";
    case "spam":
      return "danger";
    case "archived":
    default:
      return "neutral";
  }
}

/** Pipeline columns shown on the dashboard board (excludes spam/archived). */
export const BOARD_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "booked",
  "won",
  "lost",
];
