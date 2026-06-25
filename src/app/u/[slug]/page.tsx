import { loadPublicOrg } from "@/lib/public-org";
import {
  IntakeNotFound,
  IntakePageBody,
} from "@/components/public/intake-page-body";

export const dynamic = "force-dynamic";

export default async function PublicIntakeBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await loadPublicOrg({ slug });
  if (!org) return <IntakeNotFound />;
  return <IntakePageBody org={org} />;
}
