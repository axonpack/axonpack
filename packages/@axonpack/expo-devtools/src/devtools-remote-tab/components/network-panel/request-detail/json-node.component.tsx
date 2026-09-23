import { useState } from 'react';

import {
  ARRAY_CHUNK_SIZE,
  buildPreview,
  chunkArrayRange,
  isExpandable,
  isPlainObject,
  type JsonValue,
} from '../../../../core/utils/json-tree.util';

function leaf(value: JsonValue) {
  if (typeof value === 'string') return <span className="axonpack-json-string">"{value}"</span>;
  if (value === null) return <span className="axonpack-json-null">null</span>;
  return <span className="axonpack-json-number">{String(value)}</span>;
}

/**
 * One node of Chrome's JSON preview. Children are drawn only while it is open, so a large response
 * sends the branches someone opens rather than every node up front. Long arrays open into ranges,
 * the way the app's tree does.
 */
export function JsonNode({
  label,
  value,
  open: startOpen = false,
}: {
  label?: string;
  value: JsonValue;
  open?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const key = label !== undefined && <span className="axonpack-json-key">{label}: </span>;

  if (!isExpandable(value)) {
    return (
      <div className="axonpack-json-row">
        {key}
        {leaf(value)}
      </div>
    );
  }

  const children: [string, JsonValue][] = Array.isArray(value)
    ? value.length > ARRAY_CHUNK_SIZE
      ? chunkArrayRange(value.length).map(([start, end]) => [
          `[${start} … ${end}]`,
          value.slice(start, end + 1),
        ])
      : value.map((item, index) => [String(index), item])
    : Object.entries(value);

  return (
    <div>
      <div
        className="axonpack-json-row axonpack-json-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}>
        {key}
        <span className="axonpack-json-preview">
          {open
            ? Array.isArray(value)
              ? `Array(${value.length})`
              : isPlainObject(value) && 'Object'
            : buildPreview(value)}
        </span>
      </div>
      {open && (
        <div className="axonpack-json-children">
          {children.map(([childLabel, child]) => (
            <JsonNode key={childLabel} label={childLabel} value={child} />
          ))}
        </div>
      )}
    </div>
  );
}
