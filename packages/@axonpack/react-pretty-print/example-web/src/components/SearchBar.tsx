import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';
import type { SearchQuery } from '@axonpack/react-pretty-print';

/** The three flags `buildMatcher` reads, with the labels editors conventionally give them. */
const MODES: [keyof Omit<SearchQuery, 'text'>, string, string][] = [
  ['matchCase', 'Aa', 'Match case'],
  ['wholeWord', 'ab|', 'Whole word'],
  ['regex', '.*', 'Regular expression'],
];

export function SearchBar({
  query,
  invalid,
  theme,
  onChange,
}: {
  query: SearchQuery;
  /** True when the pattern will not compile — the package treats that as no search. */
  invalid: boolean;
  theme: PrettyPrintTheme;
  onChange: (query: SearchQuery) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        // Height rather than padding: the row is the tap target that focuses the field.
        minHeight: 36,
        padding: '0 8px',
        marginBottom: 16,
        borderRadius: 6,
        border: `1px solid ${invalid ? theme.string : theme.punctuation}`,
      }}>
      <span style={{ color: theme.punctuation, fontFamily: theme.fontFamily, fontSize: 12 }}>
        {query.regex ? '/' : '⌕'}
      </span>
      <input
        value={query.text}
        onChange={(event) => onChange({ ...query, text: event.target.value })}
        placeholder={query.regex ? 'pattern' : 'highlight…'}
        spellCheck={false}
        autoComplete="off"
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: 13,
          padding: 0,
        }}
      />
      {query.text.length > 0 && (
        <button
          type="button"
          title="Clear"
          onClick={() => onChange({ ...query, text: '' })}
          style={chip(theme, false)}>
          ×
        </button>
      )}
      {MODES.map(([mode, label, title]) => (
        <button
          key={mode}
          type="button"
          title={title}
          aria-pressed={query[mode]}
          onClick={() => onChange({ ...query, [mode]: !query[mode] })}
          style={chip(theme, query[mode])}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Square and centred rather than glyph-sized, so a toggle doesn't stretch the field. */
function chip(theme: PrettyPrintTheme, active: boolean) {
  return {
    minWidth: 26,
    height: 24,
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: theme.fontFamily,
    fontSize: 11,
    color: active ? theme.key : theme.punctuation,
    background: active ? theme.matchHighlight : 'transparent',
    border: `1px solid ${active ? theme.key : theme.punctuation}`,
  } as const;
}
