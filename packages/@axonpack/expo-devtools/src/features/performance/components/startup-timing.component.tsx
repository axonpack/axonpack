import { Text, View } from 'react-native';

import type { StartupTiming } from '../stores/performance.store';
import { diffMs, formatMs } from '../utils/format-metrics.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function StartupTimingSection({ startup }: { startup?: StartupTiming }) {
  const styles = useStyles();
  const measured =
    startup?.processStart !== undefined && startup.firstRender !== undefined ? startup : undefined;

  const platform =
    startup !== undefined &&
    (startup.startTime !== undefined ||
      startup.endTime !== undefined ||
      startup.initializeRuntimeStart !== undefined ||
      startup.executeJavaScriptBundleEntryPointStart !== undefined)
      ? startup
      : undefined;

  if (measured === undefined && platform === undefined) return null;

  return (
    <CollapsibleSection title="Startup">
      <View style={styles.body}>
        {measured ? (
          <>
            <Row
              label="Total"
              value={formatMs(diffMs(measured.processStart, measured.firstRender))}
            />
            <Row
              label="Native startup"
              value={formatMs(diffMs(measured.processStart, measured.nativeModuleInit))}
            />
            <Row
              label="Bundle eval"
              value={formatMs(diffMs(measured.nativeModuleInit, measured.jsBundleEval))}
            />
            <Row
              label="App setup"
              value={formatMs(diffMs(measured.jsBundleEval, measured.initCalled))}
            />
            <Row
              label="To first render"
              value={formatMs(diffMs(measured.initCalled, measured.firstRender))}
            />
            <Text style={styles.note}>
              Process start to first render, measured once at launch. The phase boundaries are where
              this package loads, so they move a little with your import order.
            </Text>
          </>
        ) : null}

        {platform ? (
          <>
            {measured ? <Text style={styles.subheading}>Reported by the platform</Text> : null}
            <Row label="Total" value={formatMs(diffMs(platform.startTime, platform.endTime))} />
            <Row
              label="Native init"
              value={formatMs(diffMs(platform.startTime, platform.initializeRuntimeStart))}
            />
            <Row
              label="Runtime setup"
              value={formatMs(
                diffMs(
                  platform.initializeRuntimeStart,
                  platform.executeJavaScriptBundleEntryPointStart
                )
              )}
            />
            <Row
              label="Bundle eval"
              value={formatMs(
                diffMs(platform.executeJavaScriptBundleEntryPointStart, platform.endTime)
              )}
            />
            {measured ? null : (
              <Text style={styles.note}>A dash means the platform did not report that marker.</Text>
            )}
          </>
        ) : null}
      </View>
    </CollapsibleSection>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  body: {
    gap: 4,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  subheading: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
}));
