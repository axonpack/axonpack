import type { XmlNode as XmlNodeValue } from '../../utils/xml/parse-xml.util';
import type { Primitives } from '../shared/primitives.ui';
import { INDENT_PER_DEPTH, type TreeStyles } from '../../utils/shared/tree-styles.util';

type XmlNodeProps = {
  primitives: Primitives;
  styles: TreeStyles;
  node: XmlNodeValue;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
};

/**
 * One node of an XML document. Elements collapse, text and CDATA are leaves — and CDATA says so,
 * because that block is the one place markup is deliberately not markup.
 */
export function XmlNode({
  primitives,
  styles,
  node,
  path,
  depth,
  expandedPaths,
  onToggle,
}: XmlNodeProps) {
  const { View, Text, Pressable } = primitives;
  const indent = { paddingLeft: depth * INDENT_PER_DEPTH };

  if (node.kind === 'text') {
    return (
      <View style={{ ...styles.wrapRow, ...indent }}>
        <Text style={{ ...styles.text, ...styles.nullValue }} selectable>
          {node.value}
        </Text>
      </View>
    );
  }

  if (node.kind === 'cdata') {
    return (
      <View style={{ ...styles.wrapRow, ...indent }}>
        <Text style={{ ...styles.mono, ...styles.punctuation }}>{'<![CDATA['}</Text>
        <Text style={{ ...styles.text, ...styles.string }} selectable>
          {node.value}
        </Text>
        <Text style={{ ...styles.mono, ...styles.punctuation }}>{']]>'}</Text>
      </View>
    );
  }

  const expanded = expandedPaths.has(path);
  const hasChildren = node.children.length > 0;

  return (
    <View>
      <Pressable
        style={{ ...styles.wrapRow, ...indent }}
        onPress={hasChildren ? () => onToggle(path) : undefined}>
        <View style={styles.toggle}>
          {hasChildren && <Text style={styles.toggleGlyph}>{expanded ? '▾' : '▸'}</Text>}
        </View>
        <Text style={{ ...styles.mono, ...styles.key }} selectable>
          {`<${node.name}`}
        </Text>
        {node.attributes.map((attribute) => (
          <Text key={attribute.name} style={styles.mono} selectable>
            <Text style={styles.punctuation}>{`${attribute.name}=`}</Text>
            <Text style={styles.string}>{`"${attribute.value}"`}</Text>
          </Text>
        ))}
        {/* Closed on its own line only when something is inside it, which is how the shape reads. */}
        <Text style={{ ...styles.mono, ...styles.key }}>{hasChildren ? '>' : '/>'}</Text>
      </Pressable>

      {hasChildren && expanded && (
        <View>
          {node.children.map((child, index) => (
            <XmlNode
              key={`${path}.${index}`}
              primitives={primitives}
              styles={styles}
              node={child}
              path={`${path}.${index}`}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
          <View style={{ ...styles.wrapRow, ...indent }}>
            <View style={styles.toggle} />
            <Text style={{ ...styles.mono, ...styles.key }}>{`</${node.name}>`}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
