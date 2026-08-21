import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { View } from 'react-native';

import { JsonNode } from './json-node.component';
import {
  collectExpandablePaths,
  collectMatchingPaths,
  formatCopyValue,
  isExpandable,
  type JsonValue,
} from '../../utils/json-tree.util';
import type { Matcher } from '../../utils/text-search.util';
import { ContextMenu, type ContextMenuItem } from '../ui/context-menu.ui';

const ROOT_PATH = '$';

type MenuState = { path: string; value: JsonValue; x: number; y: number };

export function JsonTree({
  value,
  rootLabel,
  defaultExpanded = true,
  matcher = null,
}: {
  value: JsonValue;
  rootLabel?: string;

  defaultExpanded?: boolean;
  matcher?: Matcher | null;
}) {
  // A search rebuilds the expansion from scratch: open exactly the branches holding a match, and
  // collapse the rest. An invalid pattern matches everything, so it counts as no search at all.
  function expansionFor(activeMatcher: Matcher | null): Set<string> {
    if (activeMatcher?.pattern) {
      return collectMatchingPaths(ROOT_PATH, value, activeMatcher, rootLabel);
    }
    return defaultExpanded ? new Set([ROOT_PATH]) : new Set();
  }

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => expansionFor(matcher));
  const [prevMatcher, setPrevMatcher] = useState(matcher);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Keyed on the matcher, not on the derived set: `value` is re-parsed on every render upstream, so
  // comparing the set (or the value) would loop.
  if (matcher !== prevMatcher) {
    setPrevMatcher(matcher);
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

  function openMenu(path: string, atValue: JsonValue, x: number, y: number) {
    setMenu({ path, value: atValue, x, y });
  }

  const menuItems: ContextMenuItem[] = menu
    ? [
        {
          label: isExpandable(menu.value) ? 'Copy object' : 'Copy value',
          onPress: () => {
            Clipboard.setStringAsync(formatCopyValue(menu.value));
          },
        },
        ...(isExpandable(menu.value)
          ? [
              {
                label: expandedPaths.has(menu.path) ? 'Collapse' : 'Expand',
                onPress: () => toggle(menu.path),
              },
              {
                label: 'Expand recursively',
                onPress: () => expandRecursively(menu.path, menu.value),
              },
              {
                label: 'Collapse recursively',
                onPress: () => collapseRecursively(menu.path),
              },
            ]
          : []),
      ]
    : [];

  return (
    <View>
      <JsonNode
        path={ROOT_PATH}
        label={rootLabel}
        value={value}
        depth={0}
        expandedPaths={expandedPaths}
        matcher={matcher}
        onToggle={toggle}
        onLongPress={openMenu}
      />
      <ContextMenu
        anchor={menu ? { x: menu.x, y: menu.y } : null}
        items={menuItems}
        onClose={() => setMenu(null)}
      />
    </View>
  );
}
