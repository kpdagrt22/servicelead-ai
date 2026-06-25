import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { Logo } from "@/components/marketing/site-chrome";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata = { title: "Set up your business — ServiceLead AI" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (ctx.organization) redirect("/app");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-page py-6">
        <Logo />
      </div>
      <div className="container-page max-w-3xl pb-20">
        <div className="card p-8">
          <h1 className="text-2xl font-bold">Tell us about your business</h1>
          <p className="mt-1 text-sm text-gray-600">
            This powers your missed-call SMS, AI intake questions, and lead
            summaries. You can change everything later in settings.
          </p>
          <div className="mt-6">
            <OnboardingForm
              defaultOwnerName={ctx.profile?.full_name ?? ""}
              defaultEmail={ctx.email ?? ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
