import { StyleSheet, Text, View } from 'react-native';

import { rowStyles } from './sharedStyles';
import type { NetworkLogEntry } from '../../../utils/network/networkLogStore';
import { COLORS } from '../colors';

export function TimingTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={rowStyles.section}>
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerKey} selectable>
          Started At
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerKey} selectable>
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

const styles = StyleSheet.create({
  timingNote: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
