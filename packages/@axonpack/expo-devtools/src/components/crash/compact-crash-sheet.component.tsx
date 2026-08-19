import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import { canRestartApp, restartApp } from '../../services/crash/restart-app.service';
import type { CrashRecord } from '../../stores/crash/crash.store';
import { exportCrashReport } from '../../utils/crash/export-crash-report.util';
import { formatCrashTime } from '../../utils/crash/format-crash-report.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { InsetPadding } from '../ui/inset-padding.ui';

const OFFSCREEN_Y = 400;
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 180;

/**
 * The report as somebody using the app should see it: what broke, when, and two things to do about
 * it.
 *
 * Deliberately **not** built on `BottomSheet` like every other sheet here — that one leads with this
 * package's logo, which is right for a devtools panel and wrong in front of a user. There are no
 * tabs, no stack tree and no raw JSON either; all of it still travels with Share, which serialises
 * the whole record.
 *
 * No close cross, either: the two buttons are the way out, so the choice is deliberate rather than
 * something you swipe past. The backdrop and the Android back button still dismiss it, because a
 * sheet with no exit at all is a trap.
 */
export function CompactCrashSheet({
  record,
  onClose,
}: {
  record: CrashRecord | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  const [translateY] = useState(() => new Animated.Value(OFFSCREEN_Y));
  const [shouldRender, setShouldRender] = useState(record !== null);
  const [prevRecord, setPrevRecord] = useState(record);
  const [renderedRecord, setRenderedRecord] = useState(record);

  // Keeps the last record on screen while the sheet slides out, so it doesn't blank mid-animation.
  if (record !== prevRecord) {
    setPrevRecord(record);
    if (record) {
      setShouldRender(true);
      setRenderedRecord(record);
    }
  }

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: record ? 0 : OFFSCREEN_Y,
      duration: record ? SLIDE_IN_MS : SLIDE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !record) setShouldRender(false);
    });
  }, [record, translateY]);

  if (!shouldRender || !renderedRecord) return null;

  const active = renderedRecord;
  const version = active.device?.appVersion;
  const restartable = canRestartApp();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.titleRow}>
          <MaterialIcons name="error-outline" size={20} color={COLORS.error} />
          <Text style={styles.title}>Something went wrong</Text>
        </View>

        {/* Name and message only, clamped. The full stack is a scroll of noise to anyone who isn't
            going to read it, and it leaves with Share either way. */}
        <Text style={styles.errorName} numberOfLines={1} selectable>
          {active.name}
        </Text>
        <Text style={styles.errorMessage} numberOfLines={4} selectable>
          {active.message || 'No further detail was recorded.'}
        </Text>

        <Text style={styles.meta}>
          {formatCrashTime(active.timestamp)}
          {version ? ` · v${version}` : ''}
          {active.fromPreviousLaunch ? ' · previous launch' : ''}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => exportCrashReport(active)}>
            <MaterialIcons name="ios-share" size={15} color="#ffffff" />
            <Text style={styles.primaryLabel}>Share report</Text>
          </TouchableOpacity>

          {/* Restart where it is genuinely possible, Close where it is not. iOS offers no supported
              way for an app to relaunch itself, so offering the button there would be offering
              something that cannot work. */}
          <TouchableOpacity style={styles.button} onPress={restartable ? restartApp : onClose}>
            <MaterialIcons
              name={restartable ? 'restart-alt' : 'close'}
              size={15}
              color={COLORS.textSecondary}
            />
            <Text style={styles.label}>{restartable ? 'Restart app' : 'Close'}</Text>
          </TouchableOpacity>
        </View>

        <InsetPadding edge="bottom" />
      </Animated.View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 6,
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  errorName: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
  },
  errorMessage: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textPrimary,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: TOUCH_TARGET.min,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  primaryButton: {
    flexGrow: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  primaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
}));
