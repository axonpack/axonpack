import { SquareTerminal } from 'lucide-react';
import { content } from '@/lib/services/content.service';

/**
 * The CLI prints tab-separated rows, which a real terminal lines up only by luck of tab stops. The
 * drawing pads them into columns instead, so the sample reads at a glance.
 */
function align(lines: string[]): string[] {
  const rows = lines.map((line) => line.split('\t'));
  const widths: number[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    row.forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, cell.length)));
  }
  return rows.map((row) =>
    row.length < 2 ? row[0] : row.map((cell, i) => (i < row.length - 1 ? cell.padEnd(widths[i] + 2) : cell)).join(''),
  );
}

/**
 * Always dark, in both themes, because that is what a terminal looks like next to the panel. The
 * text is real text rather than a picture, so it can be read, selected and scrolled.
 */
export function AgentTerminal({ className = '' }: { className?: string }) {
  const { terminal } = content.hero;
  const output = align(terminal.output);
  const header = terminal.output.findIndex((line) => line.includes('\t'));

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-[#0b1322] text-[#dbe4f3] shadow-2xl ring-1 ring-black/10 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2 text-[0.75rem] text-[#9fb0cc]">
        <SquareTerminal className="size-3.5" aria-hidden="true" />
        my-app
      </div>
      <pre
        tabIndex={0}
        aria-label={terminal.label}
        className="overflow-x-auto px-4 py-3.5 font-mono text-[0.75rem] leading-[1.7] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#5b9dff]"
      >
        <span className="text-[#6ea8ff]" aria-hidden="true">
          ${' '}
        </span>
        <span className="font-medium text-white">{terminal.command}</span>
        {output.map((line, i) => (
          <span key={i} className={`block ${line.startsWith('#') || i === header ? 'text-[#9fb0cc]' : ''}`}>
            {line}
          </span>
        ))}
      </pre>
    </div>
  );
}
