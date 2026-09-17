/** The same figures the on-device rows show, formatted the same way. */

export function bytes(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} kB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function duration(ms: number | undefined): string {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function clockTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** The last path segment, which is what a browser's Name column shows. */
export function fileName(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return (last ?? parsed.hostname) + parsed.search;
  } catch {
    return url;
  }
}

export function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/** The bucket a row is filed under, the way a browser groups by resource type. */
export function resourceType(entry: {
  kind: string;
  mimeType?: string;
  eventStream?: boolean;
  url: string;
}): string {
  if (entry.kind === 'websocket') return 'ws';
  if (entry.eventStream) return 'eventsource';
  const mime = entry.mimeType ?? '';
  if (mime.includes('json')) return 'fetch';
  if (mime.startsWith('image/')) return 'img';
  if (mime.includes('html')) return 'doc';
  if (mime.includes('css')) return 'css';
  if (mime.includes('javascript')) return 'js';
  if (mime.includes('font')) return 'font';
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(entry.url)) return 'img';
  return 'other';
}
