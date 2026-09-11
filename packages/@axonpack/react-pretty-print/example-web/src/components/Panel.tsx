import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';
import type { ReactNode } from 'react';

/** A titled, bordered block — the examples show four renderers and each needs the same frame. */
export function Panel({
  title,
  theme,
  children,
}: {
  title: string;
  theme: PrettyPrintTheme;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', opacity: 0.8 }}>{title}</h2>
      <div
        style={{
          padding: 12,
          overflowX: 'auto',
          border: `1px solid ${theme.punctuation}`,
          borderRadius: 8,
        }}>
        {children}
      </div>
    </section>
  );
}
