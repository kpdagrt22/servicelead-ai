import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = { title: "Log in — ServiceLead AI" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your ServiceLead AI dashboard.">
      <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
