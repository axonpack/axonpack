import {
  Braces,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Image as ImageIcon,
  MoreVertical,
  Play,
  Search,
  Zap,
} from 'lucide-react';
import { panes, type Block, type Chart, type JsonLine, type Pane, type Row, type Tone } from './devtools-panes';
import styles from './devtools-panel.module.css';

/**
 * A drawing of the panel rather than a screenshot, so it themes with the page, weighs nothing and
 * can walk its own tabs. The track repeats the first pane at the end: the loop's wrap then lands on
 * an identical frame instead of snapping backwards through five panes.
 *
 * It owns its motion and knows nothing about where it is mounted, so it outlives the hero.
 *
 * The real package paints itself green. This follows the site's own palette instead, because a
 * second accent colour in the hero would read as a different product rather than as a screenshot.
 * Status colours stay semantic: a 200 is green wherever it appears.
 *
 * The row renderers below are fragments of this one picture, not components in their own right, so
 * they live here rather than each earning a file nothing else would import.
 */

const TEXT: Record<Tone, string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-500',
  bad: 'text-rose-600 dark:text-rose-400',
  info: 'text-fd-primary',
  muted: 'text-fd-muted-foreground',
};

const FILL: Record<Tone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
  info: 'bg-fd-primary',
  muted: 'bg-fd-muted-foreground',
};

/** Roughly what an editor gives JSON, which is what the package's own viewer is tuned against. */
const VALUE: Record<NonNullable<JsonLine['kind']>, string> = {
  string: 'text-rose-700 dark:text-rose-300',
  number: 'text-blue-700 dark:text-sky-300',
  bool: 'text-blue-700 dark:text-sky-300',
  null: 'text-fd-muted-foreground',
  plain: 'text-fd-muted-foreground',
};

const GLYPHS = { json: Braces, img: ImageIcon, ws: Zap };

function Chip({ text, tone }: { text: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-fd-secondary px-1.5 py-0.5 text-[0.625rem] ${
        tone ? TEXT[tone] : 'text-fd-muted-foreground'
      }`}
    >
      {text}
    </span>
  );
}

/** The record button is a ring around a square, not a glyph, so it is drawn rather than imported. */
function RecordDot() {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-rose-500">
      <span className="size-2 rounded-[2px] bg-rose-500" />
    </span>
  );
}

function Toolbar({ pane }: { pane: Pane }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-hidden border-b bg-fd-secondary/40 px-2.5 py-1.5">
      {pane.picker ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-fd-background px-2 py-1 text-[0.6875rem] font-medium">
          <Database className="size-3" />
          {pane.picker}
          <ChevronDown className="size-3 text-fd-muted-foreground" />
        </span>
      ) : (
        <>
          <RecordDot />
          <span className="size-4 rounded-full border-[1.5px] border-fd-muted-foreground/70" />
        </>
      )}

      <span className="mx-0.5 h-4 w-px bg-fd-border" />

      {pane.tools.map((Tool, i) => (
        <Tool key={i} className="size-3.5 shrink-0 text-fd-muted-foreground" />
      ))}

      {pane.pills?.map((pill, i) => (
        <span
          key={pill}
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium whitespace-nowrap ${
            i === 0 ? 'bg-fd-primary text-fd-primary-foreground' : 'border text-fd-muted-foreground'
          }`}
        >
          {pill}
        </span>
      ))}

      {pane.badge && (
        <span className={`ms-auto text-[0.6875rem] font-semibold ${TEXT[pane.badge.tone]}`}>
          {pane.badge.text}
        </span>
      )}
    </div>
  );
}

function RequestRow({ row }: { row: Extract<Row, { kind: 'request' }> }) {
  const Glyph = GLYPHS[row.glyph];
  return (
    <li className="space-y-1 px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[0.6875rem] font-semibold">{row.method}</span>
        {row.pending ? (
          <span className="h-1 w-16 overflow-hidden rounded-full bg-fd-secondary">
            <span className={`${styles.flow} block h-full w-1/3 rounded-full bg-fd-primary`} />
          </span>
        ) : (
          <span className={`font-mono text-[0.6875rem] font-semibold ${TEXT[row.tone]}`}>
            {row.status}
          </span>
        )}
        <span className="ms-auto shrink-0 text-[0.625rem] text-fd-muted-foreground">{row.time}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Glyph className={`size-3 shrink-0 ${TEXT[row.tone]}`} />
        <span className="truncate text-[0.75rem] font-medium">{row.name}</span>
      </div>
      <p className="truncate text-[0.6875rem] text-fd-muted-foreground">{row.url}</p>
      <div className="flex items-center gap-1">
        {row.chips.map((chip) => (
          <Chip key={chip} text={chip} />
        ))}
        <MoreVertical className="ms-auto size-3 shrink-0 text-fd-muted-foreground" />
      </div>
    </li>
  );
}

function LogRow({ row }: { row: Extract<Row, { kind: 'log' }> }) {
  return (
    <li className="space-y-0.5 px-3 py-2 font-mono text-[0.6875rem]">
      {row.tag && <p className="text-fd-muted-foreground">{row.tag}</p>}
      <p className="truncate">{row.text}</p>
      {row.error && <p className="truncate text-rose-600 dark:text-rose-400">{row.error}</p>}
      {row.preview && (
        <p className="flex items-start gap-1 truncate text-fd-muted-foreground">
          <ChevronRight className="mt-px size-3 shrink-0" />
          <span className="truncate">{row.preview}</span>
        </p>
      )}
      <div className="flex items-center justify-end gap-2 text-[0.625rem] text-fd-muted-foreground">
        {row.repeat && <span className="font-semibold">{row.repeat}</span>}
        <span>{row.time}</span>
        <Copy className="size-3" />
      </div>
    </li>
  );
}

function CardRow({ row }: { row: Extract<Row, { kind: 'card' }> }) {
  return (
    <li className="space-y-1 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${FILL[row.tone]}`} />
        <span className="text-[0.75rem] font-semibold">{row.title}</span>
        {row.time && (
          <span className="ms-auto shrink-0 font-mono text-[0.625rem] text-fd-muted-foreground">
            {row.time}
          </span>
        )}
      </div>
      <p className="truncate font-mono text-[0.6875rem] text-fd-muted-foreground">{row.text}</p>
      <div className="flex items-center gap-1">
        {row.chips.map((chip) => (
          <Chip key={chip} text={chip} />
        ))}
      </div>
    </li>
  );
}

function EntryRow({ row }: { row: Extract<Row, { kind: 'entry' }> }) {
  return (
    <li className="space-y-0.5 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 font-mono text-[0.6875rem] font-bold ${TEXT[row.tone]}`}>
          {row.glyph}
        </span>
        <span className="truncate text-[0.75rem] font-medium">{row.name}</span>
        <span className="ms-auto shrink-0 text-[0.625rem] text-fd-muted-foreground">{row.size}</span>
      </div>
      <p className="flex gap-2 truncate ps-6 font-mono text-[0.6875rem]">
        <span className={`shrink-0 font-semibold ${TEXT[row.tone]}`}>{row.type}</span>
        <span className="truncate text-fd-muted-foreground">{row.preview}</span>
      </p>
    </li>
  );
}

function MetricRow({ row }: { row: Extract<Row, { kind: 'metric' }> }) {
  return (
    <li className="flex items-center gap-2.5 px-3 py-2 text-[0.75rem]">
      <span className={`h-4 w-0.5 shrink-0 rounded-full ${FILL[row.tone]}`} />
      <span className="truncate">{row.label}</span>
      <span className="ms-auto shrink-0 text-[0.6875rem] text-fd-muted-foreground">{row.sub}</span>
      <span className={`shrink-0 text-[0.6875rem] font-bold ${TEXT[row.tone]}`}>{row.value}</span>
    </li>
  );
}

/**
 * Dotted rather than solid, which is how the real chart draws a sample per frame. `non-scaling-stroke`
 * is what keeps the dots round: the viewBox is stretched to the card's width, and without it every
 * dot stretches with it.
 */
function Spark({ points }: { points: number[] }) {
  const top = Math.max(...points);
  const floor = Math.min(...points);
  const span = top - floor || 1;
  const plot = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${26 - ((p - floor) / span) * 22}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-9 w-full text-fd-primary">
      <polyline
        points={plot}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="0.5 2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ChartCard({ chart }: { chart: Chart }) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.625rem] font-semibold tracking-wide text-fd-muted-foreground uppercase">
          {chart.title}
        </span>
        {chart.meta && <span className="text-[0.625rem] text-fd-muted-foreground">{chart.meta}</span>}
        {chart.value && !chart.big && (
          <span className="text-[0.8125rem] font-bold">
            {chart.value}
            {chart.unit && (
              <span className="ms-1 text-[0.625rem] font-medium text-fd-muted-foreground">
                {chart.unit}
              </span>
            )}
          </span>
        )}
      </div>

      {chart.legend && (
        <div className="mt-1 flex items-center gap-3">
          {chart.legend.map((entry) => (
            <span key={entry.label} className="flex items-center gap-1.5 text-[0.6875rem]">
              <span className="size-1.5 rounded-full bg-fd-primary" />
              <span className="text-fd-muted-foreground">{entry.label}</span>
              <span className="font-bold">{entry.value}</span>
            </span>
          ))}
        </div>
      )}

      {chart.big && chart.value && (
        <p className="mt-0.5 text-[1.375rem] leading-tight font-bold">
          {chart.value}
          {chart.unit && <span className="ms-1 text-[0.75rem] font-medium">{chart.unit}</span>}
        </p>
      )}

      {chart.points && (
        <div className="mt-1 flex gap-1.5">
          {chart.axis && (
            <div className="flex shrink-0 flex-col justify-between text-[0.5625rem] text-fd-muted-foreground">
              {chart.axis.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Spark points={chart.points} />
            {chart.span && (
              <div className="flex justify-between text-[0.5625rem] text-fd-muted-foreground">
                {chart.span.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {chart.bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fd-secondary">
          <span className="block h-full rounded-full bg-fd-primary" style={{ width: `${chart.bar}%` }} />
        </div>
      )}

      {chart.note && <p className="mt-1 text-[0.625rem] text-fd-muted-foreground">{chart.note}</p>}
    </div>
  );
}

function JsonBlock({ lines }: { lines: JsonLine[] }) {
  return (
    <div className="space-y-0.5 font-mono text-[0.6875rem]">
      {lines.map((line, i) => (
        <p
          key={i}
          className="flex items-start gap-1 truncate"
          style={{ paddingInlineStart: `${line.indent * 0.75}rem` }}
        >
          {line.caret ? (
            line.caret === 'open' ? (
              <ChevronDown className="mt-px size-3 shrink-0 text-fd-muted-foreground" />
            ) : (
              <ChevronRight className="mt-px size-3 shrink-0 text-fd-muted-foreground" />
            )
          ) : (
            <span className="size-3 shrink-0" />
          )}
          {line.key && (
            <span className="shrink-0 text-purple-700 dark:text-purple-300">{line.key}:</span>
          )}
          <span className={`truncate ${VALUE[line.kind ?? 'plain']}`}>{line.value}</span>
        </p>
      ))}
    </div>
  );
}

function DetailBlock({ block }: { block: Block }) {
  if (block.kind === 'banner') {
    return (
      <div className="flex items-center gap-2 rounded-md border-s-2 border-rose-500 bg-rose-500/10 px-2.5 py-1.5">
        <span className="text-[0.625rem] font-bold tracking-wide text-rose-600 uppercase dark:text-rose-400">
          {block.label}
        </span>
        <span className="text-[0.75rem] font-semibold">{block.title}</span>
      </div>
    );
  }

  if (block.kind === 'json') return <JsonBlock lines={block.lines} />;

  if (block.kind === 'rows') {
    return (
      <dl className="divide-y rounded-md border">
        {block.rows.map(([key, value]) => (
          <div key={key} className="flex gap-3 px-2.5 py-1.5 text-[0.6875rem]">
            <dt className="w-24 shrink-0 font-medium text-fd-primary">{key}</dt>
            <dd className="truncate text-fd-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (block.kind === 'stack') {
    return (
      <ol className="space-y-1">
        {block.frames.map(([fn, at], i) => (
          <li key={fn} className="flex gap-2 font-mono text-[0.6875rem]">
            <span className="w-3 shrink-0 text-end text-fd-muted-foreground">{i}</span>
            <span className="min-w-0">
              <span className="block truncate">{fn}</span>
              <span className="block truncate text-fd-muted-foreground">{at}</span>
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-2">
      {block.charts.map((chart) => (
        <ChartCard key={chart.title} chart={chart} />
      ))}
    </div>
  );
}

function RowList({ rows }: { rows: Row[] }) {
  return (
    <ul className="min-h-0 flex-1 divide-y overflow-hidden">
      {rows.map((row, i) => {
        if (row.kind === 'request') return <RequestRow key={i} row={row} />;
        if (row.kind === 'log') return <LogRow key={i} row={row} />;
        if (row.kind === 'card') return <CardRow key={i} row={row} />;
        if (row.kind === 'entry') return <EntryRow key={i} row={row} />;
        return <MetricRow key={i} row={row} />;
      })}
    </ul>
  );
}

function Blocks({ pane }: { pane: Pane }) {
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3">
      {pane.detail.search && (
        <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[0.6875rem] text-fd-muted-foreground">
          <Search className="size-3" />
          <span className="flex-1">{pane.detail.search}</span>
          <span className="font-semibold">Aa</span>
          <span className="font-semibold underline">ab</span>
          <span className="font-semibold">.*</span>
        </div>
      )}
      {pane.detail.blocks.map((block, i) => (
        <DetailBlock key={i} block={block} />
      ))}
    </div>
  );
}

/**
 * Two halves, and which one leads is the pane's own call: Performance opens on Statistics, so its
 * charts take the side every other tab gives to a list.
 */
function PaneView({ pane, hidden }: { pane: Pane; hidden: boolean }) {
  const blocksLead = pane.primary === 'blocks';
  return (
    <div className="grid h-full w-full shrink-0 sm:grid-cols-[1.15fr_1fr]" aria-hidden={hidden}>
      <div className="flex min-h-0 min-w-0 flex-col border-fd-border/70 sm:border-e">
        <Toolbar pane={pane} />
        {blocksLead ? <Blocks pane={pane} /> : <RowList rows={pane.rows} />}

        {/* A docked bar, not a rounded box: the prompt is part of the panel edge it sits on. */}
        {pane.prompt && (
          <div className="flex shrink-0 items-center gap-2 border-t px-3 py-2 font-mono text-[0.6875rem] text-fd-muted-foreground">
            <ChevronRight className="size-3 shrink-0 text-fd-primary" />
            <span className="flex-1 truncate">{pane.prompt}</span>
            <Play className="size-3 shrink-0" />
          </div>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-col max-sm:hidden">
        <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2 text-[0.6875rem]">
          {pane.detail.tabs.map((tab, i) => (
            <span
              key={tab}
              className={
                i === (pane.detail.active ?? 0)
                  ? 'border-b-2 border-fd-primary pb-1 font-medium text-fd-primary'
                  : 'pb-1 text-fd-muted-foreground'
              }
            >
              {tab}
            </span>
          ))}
          <MoreVertical className="ms-auto size-3 text-fd-muted-foreground" />
        </div>

        {blocksLead ? <RowList rows={pane.rows} /> : <Blocks pane={pane} />}
      </div>
    </div>
  );
}

export function DevtoolsPanel() {
  return (
    <div className="rounded-[18px] border bg-fd-secondary p-1.5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex gap-1.5">
        {/* On the frame itself, the way a mac sidebar is part of the window rather than a panel
            inside it. No divider: the gap to the content card is the separation. */}
        <div className="shrink-0 space-y-0.5 p-1 sm:w-[132px]">
          {panes.map((pane, i) => (
            <span
              key={pane.tab}
              className={`${styles.tab} relative isolate flex items-center gap-2 rounded-md px-2 py-1.5 text-[0.75rem] font-medium`}
              style={{ animationDelay: `${4 * i - 20}s` }}
            >
              <span className="absolute inset-0 -z-10 rounded-md bg-fd-card" />
              <pane.icon className="size-3.5 shrink-0 text-fd-primary" />
              <span className="max-sm:hidden">{pane.tab}</span>
            </span>
          ))}
        </div>

        {/* The content is its own inset card, lighter than the chrome around it, which is the one
            thing that makes a window read as a window rather than as a bordered box. A fixed height
            keeps every pane the same size, so the window never resizes mid-slide, and the overflow
            it causes is what makes each list read as longer than the frame. */}
        <div className="h-[22rem] min-w-0 flex-1 overflow-hidden rounded-xl border bg-fd-background sm:h-[25rem]">
          <div className={`${styles.track} flex h-full`}>
            {[...panes, panes[0]].map((pane, i) => (
              <PaneView key={`${pane.tab}-${i}`} pane={pane} hidden={i === panes.length} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
