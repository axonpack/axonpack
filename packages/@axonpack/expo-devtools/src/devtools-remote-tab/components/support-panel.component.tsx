import type { DevtoolsSupport } from '../../core/stores/supports.store';

/**
 * A support's panel in the Axonpack tab: why it can't run, or its own panel. A DevTools tab is a
 * React root of its own, so the app's providers aren't above it and the support's goes around it
 * here.
 */
export function SupportPanel({ support }: { support: DevtoolsSupport }) {
  const { error, Provider, Panel } = support;
  if (error) {
    return (
      <p style={{ margin: 16, fontWeight: 700, color: 'var(--error)', overflowWrap: 'anywhere' }}>
        {error}
      </p>
    );
  }
  if (!Panel) return null;
  return Provider ? (
    <Provider>
      <Panel />
    </Provider>
  ) : (
    <Panel />
  );
}
