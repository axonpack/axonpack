import { Text, View } from 'react-native';

import { PhaseWaterfall } from './phase-waterfall.component';
import { useRowStyles } from './shared.styles';
import { TimingRow } from './timing-row.component';
import { formatDuration } from '../../../../core/utils/format-duration.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { isNativePhaseTimingActive } from '../../services/native-timing.service';
import type { NetworkLogEntry } from '../../stores/network-log.store';

/**
 * One account of a request, never two.
 *
 * Where the platform measured the phases, they are the whole of what this tab shows. The patches can
 * also time a request — from the call to the headers, and from there to the end — but those numbers
 * start at a different moment and cannot agree with the platform's: a JavaScript "wait" contains the
 * queue, the handshake and the send, while the platform's contains none of them. Printing both meant
 * two rows called Waiting with different figures, which reads as one of them being wrong.
 *
 * So the patches' timing is the fallback, for the traffic no native stack here reports on: a WebView's
 * requests, a build without the native module, and every platform this package has not hooked.
 */
export function TimingTab({ entry }: { entry: NetworkLogEntry }) {
  const rowStyles = useRowStyles();
  const styles = useStyles();

  return (
    <View style={rowStyles.section}>
      <TimingRow label="Started At" value={new Date(entry.startedAt).toLocaleTimeString()} />

      {entry.phases ? (
        <>
          <PhaseWaterfall phases={entry.phases} />
          <Text style={styles.timingNote} selectable>
            Timed by the platform&apos;s own networking stack, which is the only thing that can see
            inside a request. The panel&apos;s patches can only tell when a call left and when it
            came back, so their rougher numbers are left out rather than shown beside these.
          </Text>
        </>
      ) : (
        <>
          <TimingRow label="Time to headers" value={formatDuration(entry.ttfb)} />
          {entry.ttfb !== undefined && entry.duration !== undefined && (
            <TimingRow
              label="Body download"
              value={formatDuration(Math.max(0, entry.duration - entry.ttfb))}
            />
          )}
          <TimingRow
            label="Duration"
            value={entry.duration === undefined ? '(pending)' : formatDuration(entry.duration)}
          />
          <Text style={styles.timingNote} selectable>
            {isNativePhaseTimingActive()
              ? // Only some of an app's traffic goes through a stack this package hooks, so a request
                // that went out another way has these two numbers and nothing inside them.
                'Measured from JavaScript: the time until the response headers arrived, and the rest. The phases inside the wait were not reported for this request — only traffic through a native stack this package hooks is timed that way.'
              : 'Measured from JavaScript: the time until the response headers arrived, and the rest. The phases inside a request — queueing, DNS, TCP, TLS — are measured by the native networking stack, which this build has no hook into.'}
          </Text>
        </>
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
