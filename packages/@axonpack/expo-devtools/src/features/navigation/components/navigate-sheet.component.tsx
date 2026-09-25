import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { Chip } from '../../../core/components/ui/chip.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { TextArea } from '../../../core/components/ui/text-area.ui';
import { TextField } from '../../../core/components/ui/text-field.ui';
import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { navigateTo, openLink } from '../services/attach-navigation.service';

function parseParams(text: string): { params?: Record<string, unknown>; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Params must be a JSON object.' };
    }
    return { params: parsed as Record<string, unknown> };
  } catch {
    return { error: 'Params are not valid JSON.' };
  }
}

/**
 * Move the app from the panel: a route by name with params, or a deep link handed to the OS. Both
 * run the real navigator, so the app sees the move as it sees its own and is free to refuse it.
 */
export function NavigateSheet({
  container,
  suggestions,
  lastParams,
  onClose,
}: {
  /** The container the sheet moves. `null` keeps the sheet closed. */
  container: string | null;
  /** The route names the navigator has declared or the history has visited. */
  suggestions: string[];
  /** The params a route had the last time it was on top, to fill the field in. */
  lastParams: (name: string) => object | undefined;
  onClose: () => void;
}) {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [paramsText, setParamsText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsed = parseParams(paramsText);
  const typed = name.trim().toLowerCase();
  const matching = suggestions.filter((route) => route.toLowerCase().includes(typed));

  function pick(route: string) {
    setName(route);
    setError(null);
    // Only into an empty field: what was typed on purpose is not overwritten by a guess.
    const params = lastParams(route);
    if (paramsText.trim().length === 0 && params && Object.keys(params).length > 0) {
      setParamsText(JSON.stringify(params, null, 2));
    }
  }

  async function submitNavigate() {
    if (parsed.error) return setError(parsed.error);
    const message = navigateTo(name.trim(), parsed.params, container);
    if (message === null) onClose();
    else setError(message);
  }

  async function submitLink() {
    const message = await openLink(url.trim());
    if (message === null) onClose();
    else setError(message);
  }

  return (
    <BottomSheet
      visible={container !== null}
      onClose={onClose}
      headerContent={<Text style={styles.title}>Navigate · {container}</Text>}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Route name" value={name} onChangeText={setName} placeholder="Details" />
        {matching.length > 0 && (
          <View style={styles.chips}>
            {matching.map((route) => (
              <Chip
                key={route}
                label={route}
                active={route === name.trim()}
                onPress={() => pick(route)}
              />
            ))}
          </View>
        )}
        <View style={styles.field}>
          <Text style={styles.label}>Params (JSON)</Text>
          <TextArea
            value={paramsText}
            onChangeText={setParamsText}
            placeholder='{ "id": 42 }'
            minHeight={72}
            bordered
          />
        </View>
        <TouchableOpacity
          style={[styles.button, (name.trim().length === 0 || parsed.error) && styles.buttonOff]}
          disabled={name.trim().length === 0 || parsed.error !== undefined}
          onPress={submitNavigate}>
          <Text style={styles.buttonLabel}>Navigate</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TextField
          label="Deep link"
          value={url}
          onChangeText={setUrl}
          placeholder="myapp://details/42"
        />
        <TouchableOpacity
          style={[styles.button, url.trim().length === 0 && styles.buttonOff]}
          disabled={url.trim().length === 0}
          onPress={submitLink}>
          <Text style={styles.buttonLabel}>Open link</Text>
        </TouchableOpacity>

        {(error ?? parsed.error) && <Text style={styles.error}>{error ?? parsed.error}</Text>}
        <InsetPadding edge="bottom" avoidKeyboard />
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  title: {
    flex: 1,
    paddingLeft: 12,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  button: {
    minHeight: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  buttonOff: {
    opacity: 0.4,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  error: {
    fontSize: 12,
    color: COLORS.error,
  },
}));
