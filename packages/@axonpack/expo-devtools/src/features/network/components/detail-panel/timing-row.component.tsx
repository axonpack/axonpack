import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';

/** A label and a figure, for the timings that are a list rather than a waterfall. */
export function TimingRow({ label, value }: { label: string; value: string }) {
  const rowStyles = useRowStyles();

  return (
    <View style={rowStyles.headerRow}>
      <Text style={rowStyles.headerListKey} selectable>
        {label}
      </Text>
      <Text style={rowStyles.headerValue} selectable>
        {value}
      </Text>
    </View>
  );
}
