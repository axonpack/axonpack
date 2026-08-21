import { Text, View } from 'react-native';

import { PhaseWaterfall } from './phase-waterfall.component';
import { useRowStyles } from './shared.styles';
import { formatDuration } from '../../../../core/utils/format-duration.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { isNativePhaseTimingActive } from '../../services/native-timing.service';
import type { NetworkLogEntry } from '../../stores/network-log.store';

export function TimingTab({ entry }: { entry: NetworkLogEntry }) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  return (
    <View style={rowStyles.section}>
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerListKey} selectable>
          Started At
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerListKey} selectable>
          Waiting (TTFB)
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {formatDuration(entry.ttfb)}
        </Text>
      </View>
      {entry.ttfb !== undefined && entry.duration !== undefined && (
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerListKey} selectable>
            Downloading
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {formatDuration(Math.max(0, entry.duration - entry.ttfb))}
          </Text>
        </View>
      )}
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerListKey} selectable>
          Duration
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {entry.duration === undefined ? '(pending)' : formatDuration(entry.duration)}
        </Text>
      </View>
      {entry.phases ? (
        <PhaseWaterfall phases={entry.phases} />
      ) : (
        <Text style={styles.timingNote} selectable>
          {isNativePhaseTimingActive()
            ? // Reported for the stacks this package can hook, and no others — so a request that
              // went out another way has the two numbers above and nothing under them.
              'The phases inside the wait were not reported for this request. Only traffic through a native stack this package hooks is timed that way.'
            : 'Waiting is the time until the response headers arrived, and downloading is the rest — the two a patch can see from JS. The phases inside the wait are measured by the native networking stack, which this build has no hook into.'}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  timingNote: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
}));
