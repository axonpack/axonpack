import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { useTreeStyles } from './shared.styles';
import {
  ARRAY_CHUNK_SIZE,
  buildPreview,
  chunkArrayRange,
  isExpandable,
  isPlainObject,
  type JsonValue,
} from '../../utils/json-tree.util';
import { findMatches, type Matcher } from '../../utils/text-search.util';
import { useThemeColors } from '../../utils/themed-styles.util';
import { HighlightedText } from '../ui/highlighted-text.ui';

const INDENT_PER_DEPTH = 14;

export function JsonNode({
  path,
  label,
  value,
  depth,
  indexOffset = 0,
  expandedPaths,
  matcher,
  onToggle,
  onLongPress,
}: {
  path: string;
  label?: string;
  value: JsonValue;
  depth: number;
  indexOffset?: number;
  expandedPaths: Set<string>;
  matcher: Matcher | null;
  onToggle: (path: string) => void;
  onLongPress: (path: string, value: JsonValue, x: number, y: number) => void;
}) {
  const treeStyles = useTreeStyles();
  const COLORS = useThemeColors();
  const expandable = isExpandable(value);
  const expanded = expandable && expandedPaths.has(path);

  return (
    <View>
      <Pressable
        style={[treeStyles.row, { marginLeft: depth * INDENT_PER_DEPTH }]}
        onPress={expandable ? () => onToggle(path) : undefined}
        onLongPress={(event) =>
          onLongPress(path, value, event.nativeEvent.pageX, event.nativeEvent.pageY)
        }>
        <View style={treeStyles.toggle}>
          {expandable && (
            <MaterialIcons
              name={expanded ? 'expand-more' : 'chevron-right'}
              size={16}
              color={COLORS.textSecondary}
            />
          )}
        </View>
        <Text style={treeStyles.text}>
          {label !== undefined && (
            <Text style={treeStyles.key}>
              <HighlightedText
                text={label}
                ranges={findMatches(label, matcher)}
                style={treeStyles.key}
                selectable={false}
              />
              {': '}
            </Text>
          )}
          <ValuePreview value={value} matcher={matcher} />
        </Text>
      </Pressable>
      {expandable && expanded && (
        <JsonChildren
          path={path}
          value={value}
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

function ValuePreview({ value, matcher }: { value: JsonValue; matcher: Matcher | null }) {
  const treeStyles = useTreeStyles();
  // A collapsed node shows a summary (`{…}`, `Array(3)`), not searchable content of its own.
  if (isExpandable(value)) {
    return <Text style={treeStyles.punctuation}>{buildPreview(value)}</Text>;
  }
  if (typeof value === 'string') {
    return (
      <Text style={treeStyles.string}>
        &quot;
        <HighlightedText
          text={value}
          ranges={findMatches(value, matcher)}
          style={treeStyles.string}
          selectable={false}
        />
        &quot;
      </Text>
    );
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value);
    return (
      <HighlightedText
        text={text}
        ranges={findMatches(text, matcher)}
        style={typeof value === 'number' ? treeStyles.number : treeStyles.boolean}
        selectable={false}
      />
    );
  }
  return <Text style={treeStyles.nullValue}>null</Text>;
}

function JsonChildren({
  path,
  value,
  depth,
  indexOffset,
  expandedPaths,
  matcher,
  onToggle,
  onLongPress,
}: {
  path: string;
  value: JsonValue[] | { [key: string]: JsonValue };
  depth: number;
  indexOffset: number;
  expandedPaths: Set<string>;
  matcher: Matcher | null;
  onToggle: (path: string) => void;
  onLongPress: (path: string, value: JsonValue, x: number, y: number) => void;
}) {
  if (Array.isArray(value)) {
    if (value.length > ARRAY_CHUNK_SIZE) {
      return (
        <>
          {chunkArrayRange(value.length).map(([start, end]) => {
            const chunkPath = `${path}#${start}-${end}`;
            return (
              <JsonNode
                key={chunkPath}
                path={chunkPath}
                label={`[${start} … ${end}]`}
                value={value.slice(start, end + 1)}
                depth={depth}
                indexOffset={start}
                expandedPaths={expandedPaths}
                matcher={matcher}
                onToggle={onToggle}
                onLongPress={onLongPress}
              />
            );
          })}
        </>
      );
    }
    return (
      <>
        {value.map((item, index) => (
          <JsonNode
            key={`${path}.${index}`}
            path={`${path}.${index}`}
            label={String(indexOffset + index)}
            value={item}
            depth={depth}
            expandedPaths={expandedPaths}
            matcher={matcher}
            onToggle={onToggle}
            onLongPress={onLongPress}
          />
        ))}
      </>
    );
  }

  if (isPlainObject(value)) {
    const sortedEntries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return (
      <>
        {sortedEntries.map(([key, item]) => (
          <JsonNode
            key={`${path}.${key}`}
            path={`${path}.${key}`}
            label={key}
            value={item}
            depth={depth}
            expandedPaths={expandedPaths}
            matcher={matcher}
            onToggle={onToggle}
            onLongPress={onLongPress}
          />
        ))}
      </>
    );
  }

  return null;
}
