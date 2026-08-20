import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { BreadcrumbsTab } from './breadcrumbs-tab.component';
import { RawTab } from './raw-tab.component';
import { SummaryTab } from './summary-tab.component';
import { BottomSheet } from '../../../../core/components/ui/bottom-sheet.ui';
import { ContextMenu } from '../../../../core/components/ui/context-menu.ui';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { IconButton } from '../../../../core/components/ui/icon-button.ui';
import { InsetPadding } from '../../../../core/components/ui/inset-padding.ui';
import { TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import type { CrashRecord } from '../../stores/crash.store';
import { buildCrashMenuItems } from '../../utils/crash-menu-items.util';
import { exportCrashReport } from '../../utils/export-crash-report.util';
import { formatCrashTitle } from '../../utils/format-crash-report.util';

// Stack and device live inside Summary as collapsible sections rather than tabs of their own: they
// are what you read next after the message, and a tab hop lost that reading order.
type Tab = 'summary' | 'breadcrumbs' | 'raw';

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'breadcrumbs', label: 'Breadcrumbs' },
  { key: 'raw', label: 'Raw' },
];

export function CrashDetailSheet({
  record,
  onClose,
}: {
  record: CrashRecord | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  const [tab, setTab] = useState<Tab>('summary');
  const [renderedRecord, setRenderedRecord] = useState<CrashRecord | null>(null);
  const [prevRecord, setPrevRecord] = useState<CrashRecord | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Keeps the last record rendered while the sheet slides out, so it doesn't blank mid-animation.
  if (record !== prevRecord) {
    setPrevRecord(record);
    if (record && record.id !== renderedRecord?.id) setTab('summary');
    if (record) setRenderedRecord(record);
  }

  const active = record ?? renderedRecord;
  if (!active) return null;

  return (
    <BottomSheet
      visible={record !== null}
      onClose={onClose}
      headerContent={
        <View style={styles.tabBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.tabBarContent}>
            {TABS.map((current) => (
              <TouchableOpacity
                key={current.key}
                onPress={() => setTab(current.key)}
                style={[styles.tabButton, tab === current.key && styles.tabButtonActive]}>
                <Text style={[styles.tabLabel, tab === current.key && styles.tabLabelActive]}>
                  {current.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <IconButton
            name="ios-share"
            color={COLORS.textSecondary}
            hitSlop={12}
            onPress={() => exportCrashReport(active)}
            label="Share report"
          />
          <IconButton
            name="more-vert"
            color={COLORS.textSecondary}
            hitSlop={12}
            onPress={(event) =>
              setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
            }
          />
        </View>
      }>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2} selectable>
          {formatCrashTitle(active)}
        </Text>
        <CopyIconButton value={formatCrashTitle(active)} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <View>
          {tab === 'summary' && <SummaryTab record={active} />}
          {tab === 'breadcrumbs' && <BreadcrumbsTab record={active} />}
          {tab === 'raw' && <RawTab record={active} />}
          <InsetPadding edge="bottom" />
        </View>
      </ScrollView>

      <ContextMenu
        anchor={menuAnchor}
        items={buildCrashMenuItems(active)}
        onClose={() => setMenuAnchor(null)}
      />
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBar: {
    flex: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tabButton: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.accent,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
}));
