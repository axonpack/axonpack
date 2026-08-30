import { useMemo, useState } from 'react';

import { parseXml } from '../../utils/xml/parse-xml.util';
import type { Primitives } from '../shared/primitives.ui';
import { buildTreeStyles } from '../../utils/shared/tree-styles.util';
import { DARK_THEME, type PrettyPrintTheme } from '../../themes';
import { XmlNode } from './xml-node.component';

const ROOT_PATH = '0';

export type XmlTreeProps = {
  primitives: Primitives;
  source: string;
  theme?: PrettyPrintTheme;
};

/**
 * An XML document as a tree. Parsed here rather than by the platform, because React Native has no
 * `DOMParser` — see `parse-xml.util.ts`. A document that will not parse is not an error to throw at
 * the caller: it still has the raw text, and this says why the tree is absent.
 */
export function XmlTree({ primitives, source, theme = DARK_THEME }: XmlTreeProps) {
  const { View, Text } = primitives;
  const styles = useMemo(() => buildTreeStyles(theme), [theme]);
  // Keyed on `source` rather than parsed once into state, so a new document re-parses. Holding the
  // first parse in `useState` only looks correct while the caller happens to remount on every
  // change.
  const parsed = useMemo(() => parseXml(source), [source]);
  // The root open, its children closed: a document is read top down, and a hundred-entry feed
  // opened all the way is a wall.
  const [expandedPaths, setExpandedPaths] = useState(() => new Set([ROOT_PATH]));

  if ('error' in parsed) {
    return <Text style={styles.error}>Could not read this as XML — {parsed.error}</Text>;
  }

  function toggle(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <View>
      <XmlNode
        primitives={primitives}
        styles={styles}
        node={parsed.root}
        path={ROOT_PATH}
        depth={0}
        expandedPaths={expandedPaths}
        onToggle={toggle}
      />
    </View>
  );
}
