"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/app/actions";

const NAV = [
  { href: "/app", label: "Dashboard", icon: "▣", exact: true },
  { href: "/app/leads", label: "Leads", icon: "☰" },
  { href: "/app/intake", label: "Service & intake", icon: "✎" },
  { href: "/app/simulator", label: "Simulator", icon: "▶" },
  { href: "/app/billing", label: "Billing", icon: "$" },
  { href: "/app/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
          ●
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{orgName}</p>
          <p className="text-xs text-gray-400">ServiceLead AI</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOutAction} className="border-t border-gray-200 p-3">
        <button type="submit" className="btn-ghost w-full justify-start">
          ⎋ Sign out
        </button>
      </form>
    </aside>
  );
}
