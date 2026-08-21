import { useState } from 'react';
import { Text, View } from 'react-native';

import { XmlNode } from './xml-node.component';
import { parseXml } from '../../../features/network/utils/parse-xml.util';
import { makeThemedStyles } from '../../utils/themed-styles.util';

/**
 * An XML body as a tree. Parsed here rather than by the platform, because React Native has no
 * `DOMParser` — see `parse-xml.util.ts`. A document that will not parse is not an error to report at
 * the user: the caller still has the raw text, and this says why the tree is absent.
 */
export function XmlTree({ source }: { source: string }) {
  const styles = useStyles();
  const [parsed] = useState(() => parseXml(source));
  // The root open, its children closed: a response is read top down, and a hundred-entry feed opened
  // all the way is a wall.
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['0']));

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
        node={parsed.root}
        path="0"
        depth={0}
        expandedPaths={expandedPaths}
        onToggle={toggle}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  error: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
}));
