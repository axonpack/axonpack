import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useSandboxStyles } from './shared.styles';
import { HIT_SLOP, TOUCH_TARGET } from '../../../constants/metrics.const';
import type { AuthConfig, AuthType } from '../../../utils/network/sandbox.util';
import { makeThemedStyles, useThemeColors } from '../../../utils/themed-styles.util';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'none' },
  { value: 'bearer', label: 'bearer' },
  { value: 'apikey', label: 'apikey' },
];

function SecretField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const sandboxStyles = useSandboxStyles();
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[sandboxStyles.fieldBox, styles.fieldInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry={!revealed}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        onPress={() => setRevealed((prev) => !prev)}
        hitSlop={HIT_SLOP.dense}
        style={sandboxStyles.rowAction}>
        <MaterialIcons
          name={revealed ? 'visibility-off' : 'visibility'}
          size={18}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

export function AuthSection({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  const sandboxStyles = useSandboxStyles();
  const styles = useStyles();
  const COLORS = useThemeColors();
  return (
    <CollapsibleSection title="Authentication">
      <View style={styles.typeTabs}>
        {AUTH_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => onChange({ ...auth, type: t.value })}
            hitSlop={HIT_SLOP.default}
            style={styles.typeTabButton}>
            <Text style={[styles.typeTab, auth.type === t.value && styles.typeTabActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {auth.type === 'bearer' && (
        <SecretField
          label="Token"
          value={auth.bearerToken}
          onChangeText={(bearerToken) => onChange({ ...auth, bearerToken })}
          placeholder="Bearer token"
        />
      )}

      {auth.type === 'apikey' && (
        <>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={[sandboxStyles.fieldBox, styles.fieldInput]}
              value={auth.apiKeyName}
              onChangeText={(apiKeyName) => onChange({ ...auth, apiKeyName })}
              placeholder="e.g. x-api-key"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {auth.apiKeyName !== '' && (
              <TouchableOpacity
                onPress={() => onChange({ ...auth, apiKeyName: '' })}
                hitSlop={HIT_SLOP.dense}
                style={sandboxStyles.rowAction}>
                <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <SecretField
            label="Value"
            value={auth.apiKeyValue}
            onChangeText={(apiKeyValue) => onChange({ ...auth, apiKeyValue })}
          />
        </>
      )}
    </CollapsibleSection>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  typeTabs: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
  },
  typeTabButton: {
    minHeight: TOUCH_TARGET.row,
    justifyContent: 'center',
  },
  typeTab: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  typeTabActive: {
    color: COLORS.textPrimary,
    borderBottomColor: COLORS.accent,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: TOUCH_TARGET.min,
    paddingVertical: 6,
  },
  fieldLabel: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  fieldInput: {
    flex: 1,
  },
}));
