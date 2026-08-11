import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { StartupTiming } from '../../stores/performance/performance.store';
import { diffMs, formatMs } from '../../utils/performance/format-metrics.util';
import { CollapsibleSection } from '../ui/collapsible-section.ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/**
 * Two independent sources, shown in order of usefulness.
 *
 * The platform's own markers (`performance.rnStartupTiming`) only exist if native code calls
 * `ReactMarker.setAppStartTime`, and on many setups every field is null — which made this section four
 * dashes and a paragraph explaining them. The measured phases come from this package's own native
 * module instead, so they are present whenever it is installed.
 *
 * They are labelled as what they are. "Native startup" ends when *our* module is constructed, which
 * depends on autolinking order, and "Bundle eval" ends when *our* JS is evaluated, which depends on
 * import order. Neither is a platform milestone, and pretending otherwise would be the same dishonesty
 * as showing a fabricated waterfall.
 */
export function StartupTimingSection({ startup }: { startup?: StartupTiming }) {
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

  // Nothing to say at all: no native module and no platform markers.
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
              Measured from process start to the first render, once at launch. Phase boundaries are
              this package&apos;s own load points, so they shift with import order.
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

const styles = StyleSheet.create({
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
});
