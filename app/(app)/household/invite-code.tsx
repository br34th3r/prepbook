"use client";

import { useState } from "react";

/** Shows the invite code with a one-click copy button. */
export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the code is visible anyway.
    }
  }

  return (
    <div className="flex items-center gap-3">
      <code className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-lg tracking-widest text-foreground">
        {code}
      </code>
      <button type="button" onClick={copy} className="btn-secondary">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
