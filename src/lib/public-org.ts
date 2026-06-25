import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { Organization, ServiceCategory } from "@/types/database";

export interface PublicOrg {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  reviewLink: string | null;
  serviceOptions: string[];
}

/**
 * Public (unauthenticated) lookup of an organization for the customer-facing
 * intake form. Uses the service-role client because RLS blocks anonymous reads.
 * Returns null when not found or when Supabase/service role isn't configured.
 */
export async function loadPublicOrg(opts: {
  slug?: string;
  id?: string;
}): Promise<PublicOrg | null> {
  if (!isSupabaseConfigured()) return null;
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }

  let query = supabase.from("organizations").select("*").limit(1);
  if (opts.slug) query = query.eq("slug", opts.slug);
  else if (opts.id) query = query.eq("id", opts.id);
  else return null;

  const { data } = await query.maybeSingle();
  if (!data) return null;
  const org = data as Organization;

  const { data: cats } = await supabase
    .from("service_categories")
    .select("name")
    .eq("organization_id", org.id)
    .eq("active", true);

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    businessType: org.business_type,
    reviewLink: org.review_link,
    serviceOptions: ((cats ?? []) as Pick<ServiceCategory, "name">[]).map(
      (c) => c.name,
    ),
  };
}
