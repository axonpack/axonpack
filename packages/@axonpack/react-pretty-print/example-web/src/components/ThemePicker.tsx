import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';

/**
 * A horizontal strip of every palette, each chip painted in the palette it selects so the strip
 * previews the whole set. A `<select>` of 130 names tells you nothing about what you are choosing.
 */
export function ThemePicker({
  palettes,
  selected,
  onSelect,
}: {
  palettes: [string, PrettyPrintTheme][];
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 8px' }}>
      {palettes.map(([name, palette]) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          style={{
            flex: '0 0 auto',
            width: 132,
            padding: '8px 10px',
            textAlign: 'left',
            borderRadius: 8,
            cursor: 'pointer',
            background: palette.background,
            border:
              name === selected ? `2px solid ${palette.key}` : `1px solid ${palette.punctuation}`,
          }}>
          <div style={{ fontSize: 11, color: palette.text }}>
            {name
              .replace(/_THEME$/, '')
              .toLowerCase()
              .replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: palette.key }}>
            {'key: '}
            <span style={{ color: palette.string }}>&quot;value&quot;</span>
          </div>
        </button>
      ))}
    </div>
  );
}
