"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/** Hamburger menu for the marketing header on small screens. */
export function MarketingMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="rounded-lg p-2 text-xl text-gray-700 hover:bg-gray-100"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-16 z-40 border-b border-gray-200 bg-white shadow-lg">
          <nav className="container-page flex flex-col py-2 text-sm font-medium text-gray-700">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 hover:bg-gray-50"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-3 hover:bg-gray-50"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
