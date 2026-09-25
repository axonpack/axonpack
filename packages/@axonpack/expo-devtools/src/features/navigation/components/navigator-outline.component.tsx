import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import { JsonTree } from '../../../core/components/json-tree';
import { HIT_SLOP } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { containerColor } from '../constants/container-colors.const';
import { canGoBack, goBack } from '../services/attach-navigation.service';
import type { NavigationContainerInfo, NavigationState } from '../stores/navigation.store';
import { flattenNavigator, type OutlineRow } from '../utils/flatten-navigator.util';
import { formatParamLines } from '../utils/format-navigation.util';

/** One column of the tree: a rail and its node, or a guide line carried past a nested block. */
const COLUMN = 18;

/**
 * A navigator drawn as a milestone track: a rail down each navigator with a node per route, the
 * active path filled in the accent, the screen on top as the larger green node, and a parent's
 * rail carried beside a nested block so the tree stays joined up. Params sit on the route's line
 * in muted text; a tap on a route with params opens them as a tree under the row.
 */
export function NavigatorOutline({
  state,
  currentKey,
  hosted,
  container,
}: {
  state: NavigationState;
  currentKey: string | undefined;
  /** Containers mounted inside a screen, by that screen's route key, to hang under it. */
  hosted: Map<string, NavigationContainerInfo>;
  /** The container this navigator is the root of, drawn as the first chip. */
  container: string;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [expanded, setExpanded] = useState<string | null>(null);
  // Hosted containers flipped from their default, by the key of the route that hosts them.
  const [toggled, setToggled] = useState<ReadonlyMap<string, { open: boolean; from: boolean }>>(
    () => new Map()
  );
  const rows = flattenNavigator(state, currentKey, hosted, 0, 'nav', [], container, true, toggled);

  function toggleHosted(row: OutlineRow) {
    animateNextLayout();
    setToggled((previous) =>
      new Map(previous).set(row.key, { open: !row.open, from: row.openByDefault ?? false })
    );
  }

  function guides(row: OutlineRow) {
    return row.trail.map((owner, index) => (
      <View key={index} style={styles.column}>
        {owner !== null && (
          <View style={[styles.guide, { backgroundColor: containerColor(owner, COLORS) }]} />
        )}
      </View>
    ));
  }

  return (
    <View>
      {rows.map((row) => {
        if (row.kind !== 'route') {
          return (
            <View key={row.key} style={styles.row}>
              {guides(row)}
              {/* The chip sits in the rail's own column, flush left, and the rail starts from under
                  it: the container is the first stop on its track. */}
              <View style={styles.chipCell}>
                <View
                  style={[
                    styles.chipRail,
                    { backgroundColor: containerColor(row.container, COLORS) },
                  ]}
                />
                <View
                  style={[
                    styles.containerCaption,
                    { borderColor: containerColor(row.container, COLORS) },
                  ]}>
                  <MaterialIcons
                    name="account-tree"
                    size={12}
                    color={containerColor(row.container, COLORS)}
                  />
                  <Text
                    style={[
                      styles.containerName,
                      { color: containerColor(row.container, COLORS) },
                    ]}>
                    {row.label}
                  </Text>
                  {row.hosts && (
                    <View style={styles.hostChip}>
                      <MaterialIcons
                        name={row.open ? 'expand-less' : 'expand-more'}
                        size={14}
                        color={containerColor(row.hosts, COLORS)}
                      />
                      <Text
                        style={[styles.hostChipText, { color: containerColor(row.hosts, COLORS) }]}>
                        {row.hosts}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }

        const params = formatParamLines(row.params, 3);
        const open = expanded === row.key;
        const nodeStyle = row.onScreen
          ? styles.nodeOnScreen
          : row.active
            ? styles.nodeActive
            : styles.nodeIdle;
        return (
          <View key={row.key}>
            <TouchableOpacity
              // A route hosting a container opens and closes it; any other opens its params.
              disabled={!row.hosts && params.length === 0}
              onPress={() => {
                if (row.hosts) return toggleHosted(row);
                animateNextLayout();
                setExpanded(open ? null : row.key);
              }}
              style={styles.row}>
              {guides(row)}
              <View style={styles.column}>
                <View
                  style={[
                    styles.rail,
                    row.rail === 'end' && styles.railEnd,
                    { backgroundColor: containerColor(row.container, COLORS) },
                  ]}
                />
                <View style={[styles.node, nodeStyle]} />
              </View>
              <View style={styles.body}>
                <View style={styles.line}>
                  <Text
                    style={[
                      styles.name,
                      row.active && styles.nameActive,
                      row.onScreen && styles.nameOnScreen,
                    ]}
                    numberOfLines={1}
                    selectable>
                    {row.label}
                  </Text>
                  {row.onScreen && (
                    <View style={styles.onScreenPill}>
                      <Text style={styles.onScreenText}>on screen</Text>
                    </View>
                  )}
                </View>
                {params.length > 0 && (
                  <Text style={styles.params} numberOfLines={1}>
                    {params.join('  ')}
                  </Text>
                )}
              </View>
              {/* On the screen it would leave, and in the colour-free chip every panel uses, worded
                  as well as drawn. Each on-screen route moves its own container. */}
              {row.onScreen && (
                <TouchableOpacity
                  // Slim so it does not set the row's height; the slop keeps it easy to hit.
                  hitSlop={HIT_SLOP.dense}
                  onPress={() => {
                    const message = goBack(row.container);
                    if (message !== null) Alert.alert('Could not go back', message);
                  }}
                  style={[styles.back, !canGoBack(row.container) && styles.backOff]}>
                  {/* Across and then up, since going back is a step up the track from this screen. */}
                  <MaterialIcons
                    name="subdirectory-arrow-left"
                    size={12}
                    color={COLORS.accent}
                    style={styles.backIcon}
                  />
                  <Text style={styles.backLabel}>Back</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {open && !row.hosts && row.params && (
              <View style={[styles.tree, { marginLeft: (row.trail.length + 1) * COLUMN }]}>
                <JsonTree value={row.params as unknown as JsonValue} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 30,
  },
  column: {
    width: COLUMN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** An ancestor's rail carried past a nested block. */
  guide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: COLUMN / 2 - 1,
    width: 2,
    backgroundColor: COLORS.border,
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: COLUMN / 2 - 1,
    width: 2,
    backgroundColor: COLORS.border,
  },
  railEnd: {
    bottom: '50%',
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  nodeIdle: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  nodeActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  /** Larger, with a ring: the one node that is where the person is. */
  nodeOnScreen: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: COLORS.sectionTint,
    backgroundColor: COLORS.success,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
    gap: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  nameActive: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  nameOnScreen: {
    fontWeight: '700',
  },
  onScreenPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.sectionTint,
  },
  onScreenText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: COLORS.success,
  },
  params: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  chipCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** From the chip's middle down to the row's bottom, where the first route's rail picks it up. */
  chipRail: {
    position: 'absolute',
    top: '50%',
    bottom: 0,
    left: COLUMN / 2 - 1,
    width: 2,
    backgroundColor: COLORS.border,
  },
  containerCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: COLORS.sectionTint,
  },
  containerName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  tree: {
    paddingVertical: 4,
  },
  hostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  hostChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 3,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: COLORS.sectionTint,
  },
  backIcon: {
    transform: [{ rotate: '90deg' }],
  },
  backLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  backOff: {
    opacity: 0.4,
  },
}));
