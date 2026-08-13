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
