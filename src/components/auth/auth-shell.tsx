import { Logo } from "@/components/marketing/site-chrome";
import { ConfigNotice } from "@/components/config-notice";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-brand-50">
      <div className="container-page py-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            <div className="mt-6">
              {configured ? (
                children
              ) : (
                <ConfigNotice title="Supabase not configured">
                  <p>
                    Set <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
                    <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
                    <code>SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
                    <code>.env.local</code>, run the migrations in{" "}
                    <code>supabase/migrations</code>, then restart the dev
                    server to enable sign-up and login.
                  </p>
                </ConfigNotice>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
