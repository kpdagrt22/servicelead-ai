import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = { title: "Sign up — ServiceLead AI" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Set up missed-call recovery"
      subtitle="Create your account — you can try everything with the simulator before connecting any phone number."
    >
      <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
