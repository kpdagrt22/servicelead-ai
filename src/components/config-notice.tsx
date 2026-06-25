/**
 * Friendly "integration not configured" notice. Used wherever an optional
 * integration (Supabase, Twilio, Stripe, Resend) is missing so the app never
 * shows a raw crash.
 */
export function ConfigNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">⚙️ {title}</p>
      <div className="mt-2 space-y-1 text-amber-800">{children}</div>
    </div>
  );
}
