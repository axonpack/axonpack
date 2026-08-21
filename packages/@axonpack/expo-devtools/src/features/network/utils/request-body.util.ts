import { utf8ByteLength } from './response-size.util';

export type RequestField =
  | { name: string; kind: 'text'; value: string }
  | { name: string; kind: 'file'; fileName?: string; contentType?: string; size?: number };

export type DescribedRequestBody = {
  /** One line standing in for the body, which is what search, copy and the row all read. */
  preview?: string;
  /** Present only for a form-data body, where the parts are the interesting thing. */
  fields?: RequestField[];
  /**
   * How many bytes are going up, when that can be known: text is measured, a file part reports its own
   * size, and a body that says nothing about its length reports nothing. Used to model an upload's
   * time on a throttled connection, so a guess would be a wait of the wrong length.
   */
  byteSize?: number;
};

/**
 * React Native's `FormData` keeps its parts in a private array and implements no `entries()`, so the
 * standard iterator is tried first and that array is the fallback. Both shapes hold
 * `[name, value]` pairs.
 */
function formDataEntries(body: FormData): [string, unknown][] {
  const candidate = body as unknown as {
    entries?: () => Iterable<[string, unknown]>;
    _parts?: [string, unknown][];
  };

  if (typeof candidate.entries === 'function') return Array.from(candidate.entries());
  if (Array.isArray(candidate._parts)) return candidate._parts;
  return [];
}

/**
 * A file part is a `Blob` in a browser and either a `Blob` or a plain `{ uri, name, type }` object in
 * React Native, where a picked photo is passed as the latter. `Blob` keeps its name one level down,
 * on the data object it wraps.
 */
function describeFilePart(name: string, value: object): RequestField {
  const candidate = value as {
    name?: unknown;
    type?: unknown;
    size?: unknown;
    uri?: unknown;
    data?: { name?: unknown; type?: unknown; size?: unknown };
  };

  const fileName = typeof candidate.name === 'string' ? candidate.name : candidate.data?.name;
  const contentType = typeof candidate.type === 'string' ? candidate.type : candidate.data?.type;
  const size = typeof candidate.size === 'number' ? candidate.size : candidate.data?.size;

  return {
    name,
    kind: 'file',
    fileName: typeof fileName === 'string' ? fileName : undefined,
    contentType: typeof contentType === 'string' && contentType ? contentType : undefined,
    size: typeof size === 'number' ? size : undefined,
  };
}

function describeField(name: string, value: unknown): RequestField {
  if (typeof value === 'string') return { name, kind: 'text', value };
  if (typeof value === 'object' && value !== null) return describeFilePart(name, value);
  return { name, kind: 'text', value: String(value) };
}

function summarize(fields: RequestField[]): string {
  return fields
    .map((field) =>
      field.kind === 'text'
        ? `${field.name}=${field.value}`
        : `${field.name}=@${field.fileName ?? 'file'}`
    )
    .join('&');
}

/**
 * What was sent, as something a panel can show. It used to be the string `[FormData]` for every
 * upload, which said nothing about the fields or the file inside it.
 */
/** Bytes rather than characters, for the same reason the response side counts them: see `utf8ByteLength`. */
function fieldsByteSize(fields: RequestField[]): number | undefined {
  let total = 0;
  for (const field of fields) {
    if (field.kind === 'text') total += utf8ByteLength(field.value) + utf8ByteLength(field.name);
    else if (field.size === undefined)
      return undefined; // one unknown part makes the whole unknown
    else total += field.size;
  }
  return total;
}

export function describeRequestBody(body: unknown): DescribedRequestBody {
  if (body == null) return {};
  if (typeof body === 'string') return { preview: body, byteSize: utf8ByteLength(body) };

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const fields = formDataEntries(body).map(([name, value]) => describeField(name, value));
    return { preview: summarize(fields), fields, byteSize: fieldsByteSize(fields) };
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    const encoded = body.toString();
    return { preview: encoded, byteSize: utf8ByteLength(encoded) };
  }

  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    // A bare Blob is the whole body rather than a named part, so it gets a preview and no field.
    const described = describeFilePart('body', body);
    const name = described.kind === 'file' ? described.fileName : undefined;
    const size = described.kind === 'file' ? described.size : undefined;
    return {
      preview: `[file ${name ?? 'unnamed'}${size !== undefined ? `, ${size} bytes` : ''}]`,
      byteSize: size,
    };
  }

  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {
    return { preview: `[binary body, ${body.byteLength} bytes]`, byteSize: body.byteLength };
  }

  if (ArrayBuffer.isView(body)) {
    return { preview: `[binary body, ${body.byteLength} bytes]`, byteSize: body.byteLength };
  }

  return { preview: '[binary body]' };
}
