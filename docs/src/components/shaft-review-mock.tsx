import { FRAME } from '@/lib/constants/frame.const';
import { CircleCheck, CircleMinus, CircleX, TriangleAlert } from 'lucide-react';

/**
 * What Axon Shaft posts on a pull request: the top of its summary comment, then its check runs as
 * GitHub lists them. The marks, check titles and conclusions are the ones the action posts; the cart
 * change is the same example Axon Shaft's own landing page uses.
 */

type State = 'success' | 'neutral' | 'failure' | 'skipped';

const mark = {
  success: <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />,
  neutral: <TriangleAlert className="size-4 text-amber-600 dark:text-amber-500" />,
  failure: <CircleX className="size-4 text-red-600 dark:text-red-400" />,
  skipped: <CircleMinus className="size-4 text-fd-muted-foreground" />,
} satisfies Record<State, React.ReactNode>;

const checks: [name: string, title: string, state: State][] = [
  ['review', 'Reviewed 3f9c2ab', 'success'],
  ['correctness', 'Checked, nothing found', 'success'],
  ['standards', 'Findings, none blocking', 'neutral'],
  ['tests', 'Findings, none blocking', 'neutral'],
  ['security', 'Checked, nothing found', 'success'],
  ['vulnerabilities', 'No matching files changed', 'skipped'],
  ['gates', '1 of 2 gates not met', 'failure'],
];

const gates = [
  ['✗', 'A change to the cart has a test.', 'No test covers the new cart total.'],
  ['–', 'A migration has a rollback.', 'No migration in this change.'],
];

const chips = ['✅ Correctness', '✅ Breakage', '⚠️ Standards', '⚠️ Tests', '✅ Docs', '✅ Security'];
const chip = 'rounded border bg-fd-secondary px-1.5 py-0.5 text-xs';

export function ShaftReviewMock() {
  return (
    <div aria-hidden="true" className="grid gap-4 text-sm select-none">
      <div className={FRAME}>
        <p className="flex flex-wrap items-center gap-x-2 border-b bg-fd-secondary/60 px-4 py-2.5">
          <span className="font-semibold">axonshaft</span>
          <span className="rounded-full border px-1.5 text-xs text-fd-muted-foreground">bot</span>
          <span className="text-fd-muted-foreground">commented</span>
        </p>
        <div className="grid gap-3 border-s-4 border-amber-500 p-4 ps-4">
          <p className="font-semibold">Needs changes</p>
          <p>Adds a total to the cart, but formats the price by hand and has no test for it.</p>
          <p className="flex flex-wrap gap-1.5">
            <span className={chip}>🟡 2 should fix</span>
          </p>
          <p className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className={chip}>
                {c}
              </span>
            ))}
          </p>
          <p className="border-t pt-3">
            <span className="font-medium">Merge gates</span>
            {gates.map(([sign, gate, reason]) => (
              <span key={gate} className="mt-1 flex gap-2">
                <span className={sign === '✗' ? 'text-red-600 dark:text-red-400' : 'text-fd-muted-foreground'}>{sign}</span>
                <span>
                  {gate} <span className="text-fd-muted-foreground">{reason}</span>
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>

      <ShaftChecks />
    </div>
  );
}

/** The check runs as GitHub lists them under a pull request. `only` picks a few, for a small view. */
export function ShaftChecks({ only }: { only?: string[] }) {
  const rows = only ? checks.filter(([name]) => only.includes(name)) : checks;
  return (
    <div className={FRAME}>
      <ul className="divide-y">
        {rows.map(([name, title, state]) => (
          <li key={name} className="flex items-center gap-3 px-4 py-2">
            <span className="shrink-0">{mark[state]}</span>
            {/* Name and title share a line where there is room. A phone stacks them, so neither is cut. */}
            <span className="min-w-0 flex-1 sm:truncate">
              <span className="font-medium">Axon Shaft / {name}</span>{' '}
              <span className="text-fd-muted-foreground max-sm:block">{title}</span>
            </span>
            {name === 'gates' && (
              <span className="shrink-0 rounded-full border px-2 text-xs text-fd-muted-foreground">Required</span>
            )}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 border-t bg-fd-secondary/60 px-4 py-2.5 font-medium">
        <CircleX className="size-4 shrink-0 text-red-600 dark:text-red-400" />
        Merging is blocked
      </p>
    </div>
  );
}
