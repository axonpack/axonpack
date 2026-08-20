import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';

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
          Duration
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {entry.duration !== undefined ? `${entry.duration} ms` : '(pending)'}
        </Text>
      </View>
      <Text style={styles.timingNote} selectable>
        A DNS/TCP/TLS/TTFB phase breakdown isn't available here — those phases happen in the native
        networking stack, below what a fetch/XHR patch can observe from JS. Start and total duration
        are the honest ceiling for on-device requests.
      </Text>
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
