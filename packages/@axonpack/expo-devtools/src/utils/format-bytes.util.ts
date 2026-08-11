/**
 * Core rather than feature-scoped: both the network log (response size) and the performance tab
 * (JS heap) render byte counts, and they have to agree on units.
 */
const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;
/**
 * GB only past this, so the 1–1.5GB band stays in megabytes. That range is where app footprints live, and
 * "1.5 GB" throws away the hundreds of megabytes a reader is actually watching move; "1536.0 MB" keeps
 * them. Above it the numbers are device totals, where a single decimal of GB is the readable form.
 */
const GB_THRESHOLD = 1.5 * GB;

export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '–';
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  if (bytes < GB_THRESHOLD) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes < TB) return `${(bytes / GB).toFixed(1)} GB`;
  return `${(bytes / TB).toFixed(1)} TB`;
}
