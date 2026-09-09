import type { XmlNode as XmlNodeValue } from '../../utils/xml/parse-xml.util';
import { HighlightedText } from '../shared/highlighted-text.ui';
import type { Primitives } from '../shared/primitives.ui';
import { findMatches, type Matcher } from '../../utils/shared/text-search.util';
import { INDENT_PER_DEPTH, type TreeStyles } from '../../utils/shared/tree-styles.util';

type XmlNodeProps = {
  primitives: Primitives;
  styles: TreeStyles;
  node: XmlNodeValue;
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  matcher?: Matcher | null;
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
  matcher = null,
  onToggle,
}: XmlNodeProps) {
  const { View, Text, Pressable } = primitives;
  const highlight = styles.matchHighlight.backgroundColor;
  const indent = { paddingLeft: depth * INDENT_PER_DEPTH };
  const paint = (text: string, style: unknown, selectable?: boolean) => (
    <HighlightedText
      primitives={primitives}
      text={text}
      ranges={findMatches(text, matcher)}
      style={style}
      highlight={highlight}
      selectable={selectable}
    />
  );

  if (node.kind === 'text') {
    return (
      <View style={{ ...styles.wrapRow, ...indent }}>
        {paint(node.value, { ...styles.text, ...styles.nullValue }, true)}
      </View>
    );
  }

  if (node.kind === 'cdata') {
    return (
      <View style={{ ...styles.wrapRow, ...indent }}>
        <Text style={{ ...styles.mono, ...styles.punctuation }}>{'<![CDATA['}</Text>
        {paint(node.value, { ...styles.text, ...styles.string }, true)}
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
        {paint(`<${node.name}`, { ...styles.mono, ...styles.key }, true)}
        {node.attributes.map((attribute) => (
          <Text key={attribute.name} style={styles.mono} selectable>
            <Text style={styles.punctuation}>{paint(attribute.name, styles.punctuation)}=</Text>
            <Text style={styles.string}>"{paint(attribute.value, styles.string)}"</Text>
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
              matcher={matcher}
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
