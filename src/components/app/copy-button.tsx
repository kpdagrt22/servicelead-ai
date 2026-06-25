"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy summary",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-secondary text-xs">
      {copied ? "✓ Copied" : label}
    </button>
  );
}
