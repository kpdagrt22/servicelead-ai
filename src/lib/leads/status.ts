import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants";

/**
 * Allowed lead status transitions. Kept intentionally permissive (a busy owner
 * may jump a lead straight to "won"), but blocks nonsensical moves like
 * reopening a closed lead into "contacted" without going back to "new".
 */
const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "booked", "won", "lost"],
  contacted: ["booked", "won", "lost", "new"],
  booked: ["won", "lost", "contacted"],
  won: ["lost"],
  lost: ["new", "contacted"],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: LeadStatus): LeadStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

/** Buckets used by the dashboard lead board, in display order. */
export const BOARD_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "booked",
  "won",
  "lost",
];
