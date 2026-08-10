/**
 * Core rather than feature-scoped: both the network log (response size) and the performance tab
 * (JS heap) render byte counts, and they have to agree on units.
 */
export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
