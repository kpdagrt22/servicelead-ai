import { loadPublicOrg } from "@/lib/public-org";
import {
  IntakeNotFound,
  IntakePageBody,
} from "@/components/public/intake-page-body";

export const dynamic = "force-dynamic";

/** Alias of /u/[slug] addressed by organization id. */
export default async function PublicIntakeByIdPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const org = await loadPublicOrg({ id: organizationId });
  if (!org) return <IntakeNotFound />;
  return <IntakePageBody org={org} />;
}
