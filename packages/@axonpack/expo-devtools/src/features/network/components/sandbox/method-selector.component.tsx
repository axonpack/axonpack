import { StyleSheet, View } from 'react-native';

import { Chip } from '../../../../core/components/ui/chip.ui';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function MethodSelector({
  method,
  onChange,
}: {
  method: string;
  onChange: (method: string) => void;
}) {
  return (
    <View style={styles.row}>
      {METHODS.map((m) => (
        <Chip key={m} label={m} active={method === m} onPress={() => onChange(m)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
});
