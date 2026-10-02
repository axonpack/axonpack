'use client';

import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

/** The only interactive part of the hero, so the only thing that needs to be a client component. */
export function InstallChip({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-6 inline-flex max-w-full items-center gap-2.5 rounded-lg border bg-fd-card py-2 pr-2 pl-3.5 font-mono text-[0.8125rem] text-fd-muted-foreground">
      <Terminal className="size-3.5 shrink-0 opacity-60" />
      <code className="overflow-x-auto whitespace-nowrap text-fd-foreground">{command}</code>
      <button
        type="button"
        aria-label="Copy install command"
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
