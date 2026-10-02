import { BUMP_STYLES } from '@/lib/constants/bump-styles.const';

/**
 * The badge row under a version heading on a generated changelog page.
 *
 * The `## <version>` heading above it stays plain markdown on purpose: fumadocs builds the table of
 * contents and the anchor from real headings, and a component heading would drop out of both.
 *
 * Written by scripts/sync-changelog.mjs, not by hand.
 */
export function ReleaseMeta({
  date,
  bump,
  npm,
  pending,
}: {
  date?: string;
  bump?: string;
  npm?: string;
  /** npm answered and had no such version. Absent when npm could not be reached at all. */
  pending?: boolean;
}) {
  return (
    <div className="not-prose mt-1 mb-6 flex flex-wrap items-center gap-2 text-sm">
      {bump && (
        <span
          className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${BUMP_STYLES[bump] ?? BUMP_STYLES.patch}`}
        >
          {bump}
        </span>
      )}
      {date && <span className="text-fd-muted-foreground">{date}</span>}
      {!date && pending && <span className="text-fd-muted-foreground">Not yet published</span>}
      {npm && (
        <a
          href={npm}
          target="_blank"
          rel="noreferrer"
          className="ms-auto font-medium text-fd-muted-foreground no-underline hover:text-fd-primary"
        >
          on npm →
        </a>
      )}
    </div>
  );
}
