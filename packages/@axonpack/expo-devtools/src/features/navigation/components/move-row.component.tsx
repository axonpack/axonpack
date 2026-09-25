import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CallSite } from '../../../core/components/call-site.component';
import { HighlightedText } from '../../../core/components/ui/highlighted-text.ui';
import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { formatDuration } from '../../../core/utils/format-duration.util';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { actionVisual } from '../constants/action-visuals.const';
import type { NavigationMove } from '../stores/navigation.store';
import {
  formatActionLabel,
  formatClockTime,
  formatMoveTitle,
  formatParamsPreview,
} from '../utils/format-navigation.util';

function MoveRowComponent({
  move,
  stayed,
  matcher,
  showContainer,
  onPress,
}: {
  move: NavigationMove;
  /** How long the screen this move landed on stayed on top; `null` while it still is. */
  stayed: number | null;
  matcher: Matcher | null;
  /** Name the container on the row, which is worth the space only once there is more than one. */
  showContainer: boolean;
  onPress: (move: NavigationMove) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const visual = actionVisual(move.action, COLORS);
  const title = formatMoveTitle(move);
  const params = formatParamsPreview(move.to?.params);
  const path = move.to?.path;

  return (
    <TouchableOpacity
      style={[styles.row, move.noop && styles.rowNoop]}
      onPress={() => onPress(move)}>
      {/* Laid out like a request row: a top line with the kind and the time, the name under it,
          then the details. The icon sits in a gutter of its own so the lines below share one edge. */}
      <View style={[styles.gutter, { backgroundColor: visual.color }]}>
        <MaterialIcons name={visual.icon} size={14} color="#ffffff" />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.action, { color: visual.color }]}>
            {formatActionLabel(move.action)}
          </Text>
          {showContainer && <InfoBadge icon="account-tree" label={move.container} />}
          {move.noop && <Text style={styles.noop}>no change</Text>}
          <Text style={styles.time}>{formatClockTime(move.timestamp)}</Text>
        </View>

        <HighlightedText
          text={title}
          ranges={findMatches(title, matcher)}
          style={styles.title}
          numberOfLines={1}
        />

        {path && (
          <Text style={styles.path} numberOfLines={1}>
            {path}
          </Text>
        )}
        {params && (
          <HighlightedText
            text={params}
            ranges={findMatches(params, matcher)}
            style={styles.params}
            numberOfLines={1}
          />
        )}

        <View style={styles.footer}>
          {move.origin?.length ? <CallSite id={move.id} frames={move.origin} /> : <View />}
          {!move.noop && (
            <Text style={[styles.stay, stayed === null && styles.stayLive]}>
              {stayed === null ? 'on screen' : `${formatDuration(stayed)} on screen`}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const MoveRow = memo(MoveRowComponent);

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowNoop: {
    opacity: 0.6,
  },
  gutter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noop: {
    fontSize: 10,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  time: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  path: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  params: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  stay: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  stayLive: {
    color: COLORS.success,
    fontWeight: '600',
  },
}));
