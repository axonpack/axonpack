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
          Waiting (TTFB)
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {entry.ttfb !== undefined ? `${entry.ttfb} ms` : '—'}
        </Text>
      </View>
      {entry.ttfb !== undefined && entry.duration !== undefined && (
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerListKey} selectable>
            Downloading
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {`${Math.max(0, entry.duration - entry.ttfb)} ms`}
          </Text>
        </View>
      )}
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerListKey} selectable>
          Duration
        </Text>
        <Text style={rowStyles.headerValue} selectable>
          {entry.duration !== undefined ? `${entry.duration} ms` : '(pending)'}
        </Text>
      </View>
      <Text style={styles.timingNote} selectable>
        Waiting is the time until the response headers arrived, and downloading is the rest — the
        two a patch can see from JS. The phases inside the wait, DNS against TCP against TLS, happen
        in the native networking stack below it and are not broken out here.
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
