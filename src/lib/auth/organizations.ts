import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionContext } from "@/lib/auth";
import type { MemberRole } from "@/types/database";

/**
 * Centralized authorization helpers for organization-scoped resources.
 *
 * Defense-in-depth on top of RLS: even though the user-scoped Supabase client
 * already enforces row-level security, server actions and routes should still
 * explicitly assert ownership so a logic bug can never operate on another org's
 * data, and so callers get clear, non-leaky errors.
 *
 * The `assert*BelongsToOrg` helpers accept an optional Supabase client (handy
 * for tests); in normal use they lazily create the request-scoped server
 * client.
 */

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

async function defaultClient(): Promise<SupabaseClient> {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

/** Require an authenticated user; returns the session context. */
export async function requireUser() {
  const ctx = await getSessionContext();
  if (!ctx) throw new AuthorizationError("Authentication required");
  return ctx;
}

export interface OrgMembership {
  userId: string;
  organizationId: string;
  role: MemberRole;
}

/** Require the current user to be a member (owner/admin/member) of the org. */
export async function requireOrganizationMember(
  organizationId: string,
  supabase?: SupabaseClient,
): Promise<OrgMembership> {
  const ctx = await requireUser();
  const db = supabase ?? (await defaultClient());

  // Owner is always a member.
  const { data: org } = await db
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .maybeSingle();
  if (org && org.owner_id === ctx.userId) {
    return { userId: ctx.userId, organizationId, role: "owner" };
  }

  const { data: membership } = await db
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!membership) {
    throw new AuthorizationError("You are not a member of this organization");
  }
  return {
    userId: ctx.userId,
    organizationId,
    role: membership.role as MemberRole,
  };
}

/** Require the current user to be an owner or admin of the org. */
export async function requireOrganizationOwnerOrAdmin(
  organizationId: string,
  supabase?: SupabaseClient,
): Promise<OrgMembership> {
  const membership = await requireOrganizationMember(organizationId, supabase);
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new AuthorizationError("Owner or admin role required");
  }
  return membership;
}

// ── Resource-ownership assertions ───────────────────────────────────────────
async function assertBelongs(
  table: string,
  id: string,
  organizationId: string,
  supabase: SupabaseClient | undefined,
  label: string,
): Promise<Record<string, unknown>> {
  const db = supabase ?? (await defaultClient());
  const { data } = await db
    .from(table)
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) {
    throw new NotFoundError(`${label} not found in this organization`);
  }
  return data as Record<string, unknown>;
}

export const assertServiceCategoryBelongsToOrg = (
  serviceCategoryId: string,
  organizationId: string,
  supabase?: SupabaseClient,
) =>
  assertBelongs(
    "service_categories",
    serviceCategoryId,
    organizationId,
    supabase,
    "Service category",
  );

export const assertIntakeTemplateBelongsToOrg = (
  templateId: string,
  organizationId: string,
  supabase?: SupabaseClient,
) =>
  assertBelongs(
    "intake_templates",
    templateId,
    organizationId,
    supabase,
    "Intake template",
  );

export const assertLeadBelongsToOrg = (
  leadId: string,
  organizationId: string,
  supabase?: SupabaseClient,
) => assertBelongs("leads", leadId, organizationId, supabase, "Lead");

export const assertConversationBelongsToOrg = (
  conversationId: string,
  organizationId: string,
  supabase?: SupabaseClient,
) =>
  assertBelongs(
    "conversations",
    conversationId,
    organizationId,
    supabase,
    "Conversation",
  );

export const assertMessageBelongsToOrg = (
  messageId: string,
  organizationId: string,
  supabase?: SupabaseClient,
) => assertBelongs("messages", messageId, organizationId, supabase, "Message");
