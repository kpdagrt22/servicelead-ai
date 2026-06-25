import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold ${className ?? ""}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
        ●
      </span>
      <span className="text-lg tracking-tight">{APP_NAME}</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="/#how-it-works" className="hover:text-gray-900">
            How it works
          </a>
          <a href="/#use-cases" className="hover:text-gray-900">
            Use cases
          </a>
          <Link href="/pricing" className="hover:text-gray-900">
            Pricing
          </Link>
          <a href="/#faq" className="hover:text-gray-900">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Set Up Missed Call Recovery
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container-page flex flex-col gap-4 py-10 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/pricing" className="hover:text-gray-800">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-gray-800">
            Log in
          </Link>
          <a href="/#faq" className="hover:text-gray-800">
            FAQ
          </a>
        </div>
        <p className="max-w-md text-xs text-gray-400">
          ServiceLead AI responds only to inbound customer requests. It is not a
          tool for cold outbound messaging and does not provide medical advice.
        </p>
      </div>
    </footer>
  );
}
