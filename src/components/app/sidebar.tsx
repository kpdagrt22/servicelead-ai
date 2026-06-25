"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            <span className="w-4 text-center" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ orgName }: { orgName: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"
        aria-hidden
      >
        ●
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{orgName}</p>
        <p className="text-xs text-gray-400">ServiceLead AI</p>
      </div>
    </div>
  );
}

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar with hamburger (hidden on desktop). */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Brand orgName={orgName} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg p-2 text-xl text-gray-700 hover:bg-gray-100"
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer + backdrop. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
              <Brand orgName={orgName} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-xl text-gray-700 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <form action={signOutAction} className="border-t border-gray-200 p-3">
              <button type="submit" className="btn-ghost w-full justify-start">
                ⎋ Sign out
              </button>
            </form>
          </aside>
        </div>
      )}

      {/* Desktop sidebar. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-5">
          <Brand orgName={orgName} />
        </div>
        <NavLinks />
        <form action={signOutAction} className="border-t border-gray-200 p-3">
          <button type="submit" className="btn-ghost w-full justify-start">
            ⎋ Sign out
          </button>
        </form>
      </aside>
    </>
  );
}
