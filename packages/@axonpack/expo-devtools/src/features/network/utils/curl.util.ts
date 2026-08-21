import type { RequestField } from './request-body.util';

function escapeSingleQuoted(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

type CurlSource = {
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  requestFields?: RequestField[];
};

/**
 * A form-data body cannot be replayed with `--data-raw`: the boundary the platform generated is not
 * in the headers we captured, and pasting the flattened parts back would send a body that does not
 * match it. `-F` lets curl build its own instead, which is why an upload is the one shape that does
 * not go through the raw-body path.
 */
function formDataFlags(fields: RequestField[]): string[] {
  return fields.map((field) =>
    field.kind === 'text'
      ? `  -F '${escapeSingleQuoted(`${field.name}=${field.value}`)}'`
      : // `@` makes curl read the file, so the path has to exist on whoever runs it — the name is
        // all the request carried, so it is the best that can be offered.
        `  -F '${escapeSingleQuoted(`${field.name}=@${field.fileName ?? 'file'}`)}'`
  );
}

export function buildCurlCommand(entry: CurlSource): string {
  const lines = [`curl -X ${entry.method} '${escapeSingleQuoted(entry.url)}'`];
  for (const [key, value] of Object.entries(entry.requestHeaders ?? {})) {
    lines.push(`  -H '${escapeSingleQuoted(key)}: ${escapeSingleQuoted(value)}'`);
  }
  if (entry.requestFields?.length) {
    // The captured Content-Type names a boundary curl will not reuse, so let it write its own.
    const withoutContentType = lines.filter((line) => !/^\s*-H 'content-type:/i.test(line));
    return [...withoutContentType, ...formDataFlags(entry.requestFields)].join(' \\\n');
  }
  if (entry.requestBody) {
    lines.push(`  --data-raw '${escapeSingleQuoted(entry.requestBody)}'`);
  }
  return lines.join(' \\\n');
}
