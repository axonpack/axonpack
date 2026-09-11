import { useMemo, useState } from 'react';

import { JsonNode } from './json-node.component';
import {
  collectExpandablePaths,
  collectMatchingPaths,
  formatCopyValue,
  hasChildren,
  isExpandable,
  type JsonValue,
} from '../../utils/json/json-tree.util';
import type { Primitives } from '../shared/primitives.ui';
import { DARK_THEME, type PrettyPrintTheme } from '../../themes';
import { buildTreeStyles } from '../../utils/shared/tree-styles.util';
import type { Matcher } from '../../utils/shared/text-search.util';

const ROOT_PATH = '$';

export type MenuItem = { label: string; onSelect: () => void };

export type JsonTreeProps = {
  primitives: Primitives;
  value: JsonValue;
  rootLabel?: string;
  theme?: PrettyPrintTheme;
  defaultExpanded?: boolean;
  /** Clipboard is platform-specific; without this the copy items aren't offered. */
  onCopy?: (text: string) => void;
  /**
   * Fired on long-press/right-click with the items that apply to the node and the untouched
   * platform event. The popover itself is the consumer's — RN wants a `Modal`, the DOM wants a
   * portal, and there is no shared subset to render here.
   */
  onRequestMenu?: (items: MenuItem[], event: unknown) => void;
  /**
   * Drives both highlighting and expansion: the branches holding a match open, the rest collapse.
   * Pass the matcher your search UI already compiled; the shape is plain data, so nothing needs
   * converting. `null` is no search.
   */
  matcher?: Matcher | null;
};

export function JsonTree({
  primitives,
  value,
  rootLabel,
  theme = DARK_THEME,
  defaultExpanded = true,
  onCopy,
  onRequestMenu,
  matcher = null,
}: JsonTreeProps) {
  const { View } = primitives;
  const styles = useMemo(() => buildTreeStyles(theme), [theme]);
  /**
   * A search rebuilds the expansion from scratch: open exactly the branches holding a match, and
   * collapse the rest. An uncompilable pattern matches everything, so it counts as no search.
   */
  function expansionFor(active: Matcher | null): Set<string> {
    if (active?.pattern) return collectMatchingPaths(ROOT_PATH, value, active, rootLabel);
    return defaultExpanded ? new Set([ROOT_PATH]) : new Set();
  }

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => expansionFor(matcher));
  const [previousMatcher, setPreviousMatcher] = useState(matcher);

  // Keyed on the matcher, not on the set it derives: `value` is often re-parsed on every render
  // upstream, so comparing the set — or the value — would loop.
  if (matcher !== previousMatcher) {
    setPreviousMatcher(matcher);
    setExpandedPaths(expansionFor(matcher));
  }

  function toggle(path: string) {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function expandRecursively(path: string, atValue: JsonValue) {
    setExpandedPaths((prev) => new Set([...prev, ...collectExpandablePaths(path, atValue)]));
  }

  function collapseRecursively(path: string) {
    setExpandedPaths((prev) => {
      const next = new Set<string>();
      for (const existing of prev) {
        // `#` as well as `.` — a chunk bucket is a child too.
        if (
          existing !== path &&
          !existing.startsWith(`${path}.`) &&
          !existing.startsWith(`${path}#`)
        ) {
          next.add(existing);
        }
      }
      return next;
    });
  }

  function menuItemsFor(path: string, atValue: JsonValue): MenuItem[] {
    const items: MenuItem[] = [];
    if (onCopy) {
      items.push({
        label: isExpandable(atValue) ? 'Copy object' : 'Copy value',
        onSelect: () => onCopy(formatCopyValue(atValue)),
      });
    }
    if (hasChildren(atValue)) {
      items.push(
        {
          label: expandedPaths.has(path) ? 'Collapse' : 'Expand',
          onSelect: () => toggle(path),
        },
        { label: 'Expand recursively', onSelect: () => expandRecursively(path, atValue) },
        { label: 'Collapse recursively', onSelect: () => collapseRecursively(path) }
      );
    }
    return items;
  }

  return (
    <View>
      <JsonNode
        primitives={primitives}
        styles={styles}
        path={ROOT_PATH}
        label={rootLabel}
        value={value}
        depth={0}
        expandedPaths={expandedPaths}
        matcher={matcher}
        onToggle={toggle}
        onLongPress={
          onRequestMenu
            ? (path, atValue, event) => onRequestMenu(menuItemsFor(path, atValue), event)
            : undefined
        }
      />
    </View>
  );
}
