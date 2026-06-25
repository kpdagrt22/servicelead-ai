import { requireOrg } from "@/lib/auth";
import { Sidebar } from "@/components/app/sidebar";

// Every authenticated page depends on the request (auth cookies + live data),
// so opt the whole segment out of static prerendering.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireOrg();

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={ctx.organization.name} />
      <main className="flex-1 overflow-x-hidden bg-gray-50">
        <div className="mx-auto w-full max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
