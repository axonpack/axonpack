'use client';

import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

/** A client component of its own, so the sections that show a command can stay server components. */
export function InstallChip({ command, label = 'Copy install command' }: { command: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-6 inline-flex max-w-full items-center gap-2.5 rounded-lg border bg-fd-card py-2 pr-2 pl-3.5 font-mono text-[0.8125rem] text-fd-muted-foreground">
      <Terminal className="size-3.5 shrink-0 opacity-60" />
      {/* Wraps on a phone, where a long command would otherwise hide half of itself in a scroll. */}
      <code className="text-start text-fd-foreground [overflow-wrap:anywhere] sm:overflow-x-auto sm:whitespace-nowrap">
        {command}
      </code>
      <button
        type="button"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
          } catch {
            return; // No clipboard permission, or not a secure origin.
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="grid size-8 shrink-0 place-items-center rounded-md bg-fd-secondary hover:text-fd-primary"
      >
        {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
