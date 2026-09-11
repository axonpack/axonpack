import { useMemo, useState } from 'react';

import { collectMatchingPaths, parseXml } from '../../utils/xml/parse-xml.util';
import type { Matcher } from '../../utils/shared/text-search.util';
import type { Primitives } from '../shared/primitives.ui';
import { buildTreeStyles } from '../../utils/shared/tree-styles.util';
import { DARK_THEME, type PrettyPrintTheme } from '../../themes';
import { XmlNode } from './xml-node.component';

const ROOT_PATH = '0';

export type XmlTreeProps = {
  primitives: Primitives;
  source: string;
  theme?: PrettyPrintTheme;
  /**
   * Drives both highlighting and expansion: the elements holding a match open, the rest collapse.
   * Pass the matcher your search UI already compiled; the shape is plain data. `null` is no search.
   */
  matcher?: Matcher | null;
};

/**
 * An XML document as a tree. Parsed here rather than by the platform, because React Native has no
 * `DOMParser` — see `parse-xml.util.ts`. A document that will not parse is not an error to throw at
 * the caller: it still has the raw text, and this says why the tree is absent.
 */
export function XmlTree({ primitives, source, theme = DARK_THEME, matcher = null }: XmlTreeProps) {
  const { View, Text } = primitives;
  const styles = useMemo(() => buildTreeStyles(theme), [theme]);
  // Keyed on `source` rather than parsed once into state, so a new document re-parses. Holding the
  // first parse in `useState` only looks correct while the caller happens to remount on every
  // change.
  const parsed = useMemo(() => parseXml(source), [source]);
  /**
   * A search rebuilds the expansion from scratch: open exactly the elements holding a match, and
   * collapse the rest. Otherwise the root is open and its children closed — a document is read top
   * down, and a hundred-entry feed opened all the way is a wall.
   */
  function expansionFor(active: Matcher | null): Set<string> {
    if (active?.pattern && !('error' in parsed)) {
      return collectMatchingPaths(parsed.root, ROOT_PATH, active);
    }
    return new Set([ROOT_PATH]);
  }

  const [expandedPaths, setExpandedPaths] = useState(() => expansionFor(matcher));
  const [previousMatcher, setPreviousMatcher] = useState(matcher);

  // Keyed on the matcher rather than the set it derives, for the same reason as the JSON tree: a
  // caller re-deriving the source would otherwise loop.
  if (matcher !== previousMatcher) {
    setPreviousMatcher(matcher);
    setExpandedPaths(expansionFor(matcher));
  }

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
        matcher={matcher}
        onToggle={toggle}
      />
    </View>
  );
}
