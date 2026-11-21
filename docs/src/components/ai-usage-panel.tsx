import { Bot } from 'lucide-react';
import { QueryRow, RecordDot } from '@/components/devtools-panel';
import { panes } from '@/components/devtools-panes';
import { content } from '@/lib/services/content.service';

// The hero's carousel shows this pane only while it slides, and never with reduced motion, so the
// section about it draws the same rows again, standing still.
const aiUsage = panes.find((pane) => pane.tab === 'CLI');

export function AiUsagePanel() {
  if (!aiUsage) return null;

  return (
    <div
      role="img"
      aria-label={content.agent.usage.label}
      className="rounded-[18px] border bg-fd-secondary p-1.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
    >
      <div className="overflow-hidden rounded-xl border bg-fd-background">
        <div className="flex items-center gap-1.5 border-b bg-fd-secondary/40 px-2.5 py-1.5">
          <RecordDot />
          <span className="size-4 rounded-full border-[1.5px] border-fd-muted-foreground/70" />
          <span className="mx-0.5 h-4 w-px bg-fd-border" />
          <Bot className="size-3.5 text-fd-primary" />
          <span className="text-[0.75rem] font-medium">CLI</span>
        </div>
        <ul className="divide-y">
          {aiUsage.rows.map((row, i) => row.kind === 'query' && <QueryRow key={i} row={row} />)}
        </ul>
      </div>
    </div>
  );
}
