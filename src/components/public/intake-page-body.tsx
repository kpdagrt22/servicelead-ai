import { PublicIntakeForm } from "@/components/public/intake-form";
import type { PublicOrg } from "@/lib/public-org";

export function IntakePageBody({ org }: { org: PublicOrg }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-brand-50">
      <div className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {org.businessType
                ? `${org.businessType} — tell us what you need and we'll get right back to you.`
                : "Tell us what you need and we'll get right back to you."}
            </p>
          </div>
          <div className="card p-6">
            <PublicIntakeForm slug={org.slug} serviceOptions={org.serviceOptions} />
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            Powered by ServiceLead AI · We only use your info to respond to this
            request.
          </p>
        </div>
      </div>
    </div>
  );
}

export function IntakeNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Business not found</h1>
        <p className="mt-2 text-gray-600">
          This intake link is invalid, or the business hasn't finished setting up
          yet.
        </p>
      </div>
    </div>
  );
}
