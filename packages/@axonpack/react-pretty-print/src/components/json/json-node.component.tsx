import {
  ARRAY_CHUNK_SIZE,
  buildPreview,
  chunkArrayRange,
  hasChildren,
  isExpandable,
  isPlainObject,
  type JsonValue,
} from '../../utils/json/json-tree.util';
import { HighlightedText } from '../shared/highlighted-text.ui';
import type { Primitives } from '../shared/primitives.ui';
import { findMatches, type Matcher } from '../../utils/shared/text-search.util';
import { INDENT_PER_DEPTH, type TreeStyles } from '../../utils/shared/tree-styles.util';

type NodeProps = {
  primitives: Primitives;
  styles: TreeStyles;
  path: string;
  label?: string;
  value: JsonValue;
  depth: number;
  indexOffset?: number;
  expandedPaths: Set<string>;
  matcher?: Matcher | null;
  onToggle: (path: string) => void;
  onLongPress?: (path: string, value: JsonValue, event: unknown) => void;
};

export function JsonNode({
  primitives,
  styles,
  path,
  label,
  value,
  depth,
  indexOffset = 0,
  expandedPaths,
  matcher = null,
  onToggle,
  onLongPress,
}: NodeProps) {
  const { View, Text, Pressable } = primitives;
  const highlight = styles.matchHighlight.backgroundColor;
  const expandable = hasChildren(value);
  const expanded = expandable && expandedPaths.has(path);

  return (
    <View>
      <Pressable
        style={{ ...styles.row, marginLeft: depth * INDENT_PER_DEPTH }}
        onPress={expandable ? () => onToggle(path) : undefined}
        onLongPress={onLongPress ? (event) => onLongPress(path, value, event) : undefined}>
        <View style={styles.toggle}>
          {expandable && <Text style={styles.toggleGlyph}>{expanded ? '▾' : '▸'}</Text>}
        </View>
        <Text style={styles.text}>
          {label !== undefined && (
            <Text style={styles.key}>
              <HighlightedText
                primitives={primitives}
                text={label}
                ranges={findMatches(label, matcher)}
                style={styles.key}
                highlight={highlight}
              />
              {': '}
            </Text>
          )}
          <ValuePreview
            primitives={primitives}
            styles={styles}
            value={value}
            matcher={matcher}
            highlight={highlight}
          />
        </Text>
      </Pressable>
      {expanded && (
        <JsonChildren
          primitives={primitives}
          styles={styles}
          path={path}
          value={value as JsonValue[] | { [key: string]: JsonValue }}
          depth={depth + 1}
          indexOffset={indexOffset}
          expandedPaths={expandedPaths}
          matcher={matcher}
          onToggle={onToggle}
          onLongPress={onLongPress}
        />
      )}
    </View>
  );
}

function ValuePreview({
  primitives,
  styles,
  value,
  matcher,
  highlight,
}: {
  primitives: Primitives;
  styles: TreeStyles;
  value: JsonValue;
  matcher: Matcher | null;
  highlight: string;
}) {
  const { Text } = primitives;

  // A closed container shows a summary, which is not searchable content of its own — the search
  // walk looks at the leaves underneath it instead.
  if (isExpandable(value)) return <Text style={styles.punctuation}>{buildPreview(value)}</Text>;

  if (typeof value === 'string') {
    return (
      <Text style={styles.string}>
        "
        <HighlightedText
          primitives={primitives}
          text={value}
          ranges={findMatches(value, matcher)}
          style={styles.string}
          highlight={highlight}
        />
        "
      </Text>
    );
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const rendered = String(value);
    return (
      <HighlightedText
        primitives={primitives}
        text={rendered}
        ranges={findMatches(rendered, matcher)}
        style={typeof value === 'number' ? styles.number : styles.boolean}
        highlight={highlight}
      />
    );
  }

  // `null` renders unhighlighted, which is what the search walk assumes.
  return <Text style={styles.nullValue}>null</Text>;
}

function JsonChildren({
  primitives,
  styles,
  path,
  value,
  depth,
  indexOffset,
  expandedPaths,
  matcher,
  onToggle,
  onLongPress,
}: Omit<NodeProps, 'label' | 'value'> & {
  value: JsonValue[] | { [key: string]: JsonValue };
  indexOffset: number;
}) {
  const shared = { primitives, styles, depth, expandedPaths, matcher, onToggle, onLongPress };

  if (Array.isArray(value)) {
    if (value.length > ARRAY_CHUNK_SIZE) {
      return chunkArrayRange(value.length).map(([start, end]) => {
        const chunkPath = `${path}#${start}-${end}`;
        return (
          <JsonNode
            key={chunkPath}
            {...shared}
            path={chunkPath}
            label={`[${start} … ${end}]`}
            value={value.slice(start, end + 1)}
            indexOffset={start}
          />
        );
      });
    }
    return value.map((item, index) => (
      <JsonNode
        key={`${path}.${index}`}
        {...shared}
        path={`${path}.${index}`}
        label={String(indexOffset + index)}
        value={item}
      />
    ));
  }

  if (isPlainObject(value)) {
    return Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => (
        <JsonNode
          key={`${path}.${key}`}
          {...shared}
          path={`${path}.${key}`}
          label={key}
          value={item}
        />
      ));
  }

  return null;
}
