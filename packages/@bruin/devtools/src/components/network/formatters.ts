import { COLORS } from './colors';

/** Color-codes an HTTP method the way most API tooling does (GET blue, POST green, mutate-in-place amber, DELETE red). */
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return COLORS.accent;
    case 'POST':
      return COLORS.success;
    case 'PUT':
    case 'PATCH':
      return COLORS.warning;
    case 'DELETE':
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
}

export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Last path segment plus the query string, matching Chrome's "Name" column (used for big rows). */
export function getDisplayNameWithQuery(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const name =
      segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : parsed.hostname;
    return parsed.search ? `${name}${parsed.search}` : name;
  } catch {
    return url;
  }
}
