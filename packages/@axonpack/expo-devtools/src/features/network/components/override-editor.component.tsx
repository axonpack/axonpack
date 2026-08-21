import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { TextArea } from '../../../core/components/ui/text-area.ui';
import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { networkOverridesStore } from '../stores/network-overrides.store';

export function OverrideEditor({ url, onClose }: { url: string | null; onClose: () => void }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [status, setStatus] = useState('200');
  const [contentType, setContentType] = useState('application/json');
  const [body, setBody] = useState('');

  // Reloaded whenever a different row opens the sheet, so editing an existing rule starts from it
  // rather than from whatever the last one held.
  useEffect(() => {
    if (url === null) return;
    const existing = networkOverridesStore.find(url);
    setStatus(String(existing?.status ?? 200));
    setContentType(existing?.contentType ?? 'application/json');
    setBody(existing?.body ?? '');
  }, [url]);

  function save() {
    if (url === null) return;
    const parsed = Number(status);
    networkOverridesStore.set({
      url,
      action: 'respond',
      // A status that isn't a number is not a status; 200 is the honest reading of an empty field.
      status: Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : 200,
      contentType: contentType.trim() || 'application/json',
      body,
    });
    onClose();
  }

  function remove() {
    if (url !== null) networkOverridesStore.remove(url);
    onClose();
  }

  const existing = url !== null ? networkOverridesStore.find(url) : undefined;

  return (
    <BottomSheet visible={url !== null} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.label}>URL</Text>
        <Text style={styles.url} numberOfLines={2} selectable>
          {url}
        </Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={status}
                onChangeText={setStatus}
                keyboardType="number-pad"
                placeholder="200"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
          <View style={styles.fieldWide}>
            <Text style={styles.label}>Content type</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={contentType}
                onChangeText={setContentType}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="application/json"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        <Text style={styles.label}>Body</Text>
        <TextArea value={body} onChangeText={setBody} bordered placeholder="Response body" />

        <Text style={styles.note}>
          The request is not sent while this rule is on — the body above is answered straight away,
          so the endpoint does not have to exist.
        </Text>

        <View style={styles.actions}>
          {existing && (
            <TouchableOpacity onPress={remove} style={styles.button}>
              <Text style={[styles.buttonLabel, { color: COLORS.error }]}>Remove</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={save} style={styles.button}>
            <Text style={[styles.buttonLabel, { color: COLORS.accent }]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  content: {
    padding: 12,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  url: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textPrimary,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  fieldWide: {
    flex: 2,
    gap: 4,
  },
  // Per the input conventions: the row is the tap target and the only visible chrome.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    minHeight: TOUCH_TARGET.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0,
  },
  note: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    paddingTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
  },
  button: {
    minHeight: TOUCH_TARGET.dense,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
}));
