import { useMemo, useState } from 'react';

import { JsonNode } from './json-node.component';
import {
  collectExpandablePaths,
  formatCopyValue,
  hasChildren,
  isExpandable,
  type JsonValue,
} from '../../utils/json/json-tree.util';
import type { Primitives } from '../shared/primitives.ui';
import { DARK_THEME, type PrettyPrintTheme } from '../../themes';
import { buildTreeStyles } from '../../utils/shared/tree-styles.util';

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
};

export function JsonTree({
  primitives,
  value,
  rootLabel,
  theme = DARK_THEME,
  defaultExpanded = true,
  onCopy,
  onRequestMenu,
}: JsonTreeProps) {
  const { View } = primitives;
  const styles = useMemo(() => buildTreeStyles(theme), [theme]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() =>
    defaultExpanded ? new Set([ROOT_PATH]) : new Set()
  );

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
