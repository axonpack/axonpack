import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import {
  ARRAY_CHUNK_SIZE,
  buildPreview,
  chunkArrayRange,
  isExpandable,
  isPlainObject,
  type JsonValue,
} from './json-tree.util';
import { treeStyles } from './shared.styles';
import { COLORS } from '../../../../constants/colors.const';

const INDENT_PER_DEPTH = 14;

export function JsonNode({
  path,
  label,
  value,
  depth,
  indexOffset = 0,
  expandedPaths,
  onToggle,
  onLongPress,
}: {
  path: string;
  label?: string;
  value: JsonValue;
  depth: number;
  indexOffset?: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onLongPress: (path: string, value: JsonValue, x: number, y: number) => void;
}) {
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
              size={14}
              color={COLORS.textSecondary}
            />
          )}
        </View>
        <Text style={treeStyles.text}>
          {label !== undefined && <Text style={treeStyles.key}>{label}: </Text>}
          <ValuePreview value={value} />
        </Text>
      </Pressable>
      {expandable && expanded && (
        <JsonChildren
          path={path}
          value={value}
          depth={depth + 1}
          indexOffset={indexOffset}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          onLongPress={onLongPress}
        />
      )}
    </View>
  );
}

function ValuePreview({ value }: { value: JsonValue }) {
  if (isExpandable(value)) {
    return <Text style={treeStyles.punctuation}>{buildPreview(value)}</Text>;
  }
  if (typeof value === 'string') return <Text style={treeStyles.string}>&quot;{value}&quot;</Text>;
  if (typeof value === 'number') return <Text style={treeStyles.number}>{value}</Text>;
  if (typeof value === 'boolean') return <Text style={treeStyles.boolean}>{String(value)}</Text>;
  return <Text style={treeStyles.nullValue}>null</Text>;
}

function JsonChildren({
  path,
  value,
  depth,
  indexOffset,
  expandedPaths,
  onToggle,
  onLongPress,
}: {
  path: string;
  value: JsonValue[] | { [key: string]: JsonValue };
  depth: number;
  indexOffset: number;
  expandedPaths: Set<string>;
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
            onToggle={onToggle}
            onLongPress={onLongPress}
          />
        ))}
      </>
    );
  }

  if (isPlainObject(value)) {
    // Chrome alphabetizes the expanded property list, even though the inline preview above
    // keeps the object's original key order.
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
            onToggle={onToggle}
            onLongPress={onLongPress}
          />
        ))}
      </>
    );
  }

  return null;
}
