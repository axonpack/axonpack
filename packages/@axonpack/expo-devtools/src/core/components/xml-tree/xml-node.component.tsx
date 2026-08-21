import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import type { XmlNode as XmlNodeValue } from '../../../features/network/utils/parse-xml.util';
import { useThemeColors } from '../../utils/themed-styles.util';
import { useTreeStyles } from '../json-tree/shared.styles';

const INDENT_PER_DEPTH = 14;

/**
 * One node of an XML document. Elements collapse, text and CDATA are leaves — and CDATA says so,
 * because that block is the one place markup is deliberately not markup.
 */
export function XmlNode({
  node,
  path,
  depth,
  expandedPaths,
  onToggle,
}: {
  node: XmlNodeValue;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const treeStyles = useTreeStyles();
  const COLORS = useThemeColors();
  const indent = { paddingLeft: depth * INDENT_PER_DEPTH };

  if (node.kind === 'text') {
    return (
      <Text style={[treeStyles.row, treeStyles.text, indent]} selectable>
        {node.value}
      </Text>
    );
  }

  if (node.kind === 'cdata') {
    return (
      <View style={[treeStyles.row, indent]}>
        <Text style={treeStyles.punctuation}>{'<![CDATA['}</Text>
        <Text style={treeStyles.string} selectable>
          {node.value}
        </Text>
        <Text style={treeStyles.punctuation}>{']]>'}</Text>
      </View>
    );
  }

  const expanded = expandedPaths.has(path);
  const hasChildren = node.children.length > 0;

  return (
    <View>
      <Pressable
        onPress={() => hasChildren && onToggle(path)}
        style={[treeStyles.row, indent]}
        disabled={!hasChildren}>
        {hasChildren ? (
          <MaterialIcons
            name={expanded ? 'arrow-drop-down' : 'arrow-right'}
            size={16}
            color={COLORS.textSecondary}
          />
        ) : (
          <View style={treeStyles.toggle} />
        )}
        <Text style={treeStyles.key} selectable>
          {`<${node.name}`}
        </Text>
        {node.attributes.map((attribute) => (
          <Text key={attribute.name} selectable>
            <Text style={treeStyles.punctuation}>{` ${attribute.name}=`}</Text>
            <Text style={treeStyles.string}>{`"${attribute.value}"`}</Text>
          </Text>
        ))}
        {/* Closed on its own line only when something is inside it, which is how the shape reads. */}
        <Text style={treeStyles.key}>{hasChildren ? '>' : ' />'}</Text>
      </Pressable>

      {hasChildren &&
        expanded &&
        node.children.map((child, index) => (
          <XmlNode
            key={`${path}.${index}`}
            node={child}
            path={`${path}.${index}`}
            depth={depth + 1}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
          />
        ))}

      {hasChildren && expanded && (
        <Text style={[treeStyles.row, treeStyles.text, treeStyles.key, indent]}>
          {`</${node.name}>`}
        </Text>
      )}
    </View>
  );
}
