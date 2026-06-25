import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";

/**
 * Server-side helpers for resolving the current user, their profile, and their
 * active organization. The "active org" is simply the first org the user owns
 * or is a member of — multi-org switching is out of scope for the MVP.
 */

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  organization: Organization | null;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Org the user owns, falling back to membership.
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let organization = ownedOrg ?? null;
  if (!organization) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, organizations(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    organization =
      (membership?.organizations as unknown as Organization) ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
    organization: (organization as Organization) ?? null,
  };
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Require a logged-in user WITH an onboarded organization. */
export async function requireOrg(): Promise<
  SessionContext & { organization: Organization }
> {
  const ctx = await requireUser();
  if (!ctx.organization) redirect("/onboarding");
  return ctx as SessionContext & { organization: Organization };
}
