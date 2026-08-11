/**
 * `name` on a long task is a spec enum describing where the *culprit* ran, not what it was — the
 * values are designed for frames (`self`, `same-origin-descendant`, `cross-origin-ancestor`, …). React
 * Native has no frames, so it reads `self` on essentially every row, which is why the raw value makes
 * the list look like identical entries.
 */
const LABELS: Record<string, string> = {
  self: 'This app',
  'same-origin': 'Same origin',
  'same-origin-ancestor': 'Same origin (parent)',
  'same-origin-descendant': 'Same origin (child)',
  'cross-origin-ancestor': 'Another origin (parent)',
  'cross-origin-descendant': 'Another origin (child)',
  'cross-origin-unreachable': 'Another origin',
  'multiple-contexts': 'Several contexts',
  unknown: 'Outside the event loop',
};

export function formatLongTaskName(name: string): string {
  return LABELS[name] ?? (name || 'Unknown');
}
