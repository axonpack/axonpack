import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TextInput, TouchableOpacity, View } from 'react-native';

import { useSandboxStyles } from './shared.styles';
import { HIT_SLOP } from '../../../../core/constants/metrics.const';
import { ensureTrailingBlankRow, type KeyValueRow } from '../../utils/sandbox.util';
import { useThemeColors } from '../../../../core/utils/themed-styles.util';

export function KeyValueTable({
  rows,
  onChange,
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}) {
  const sandboxStyles = useSandboxStyles();
  const COLORS = useThemeColors();
  function updateRow(id: string, patch: Partial<KeyValueRow>) {
    onChange(
      ensureTrailingBlankRow(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    );
  }

  function removeRow(id: string) {
    onChange(ensureTrailingBlankRow(rows.filter((row) => row.id !== id)));
  }

  return (
    <View>
      {rows.map((row) => {
        const isBlank = !row.key && !row.value;
        return (
          <View key={row.id} style={sandboxStyles.row}>
            <TouchableOpacity
              onPress={() => updateRow(row.id, { enabled: !row.enabled })}
              hitSlop={HIT_SLOP.dense}
              style={sandboxStyles.rowAction}>
              <MaterialIcons
                name={row.enabled ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={row.enabled ? COLORS.accent : COLORS.textSecondary}
              />
            </TouchableOpacity>
            <TextInput
              style={[sandboxStyles.fieldBox, sandboxStyles.keyField]}
              value={row.key}
              onChangeText={(key) => updateRow(row.id, { key })}
              placeholder="Key"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[sandboxStyles.fieldBox, sandboxStyles.valueField]}
              value={row.value}
              onChangeText={(value) => updateRow(row.id, { value })}
              placeholder="Value"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!isBlank && (
              <TouchableOpacity
                onPress={() => removeRow(row.id)}
                hitSlop={HIT_SLOP.dense}
                style={sandboxStyles.rowAction}>
                <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}
