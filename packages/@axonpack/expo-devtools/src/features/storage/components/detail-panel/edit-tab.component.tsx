import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useDetailStyles } from './shared.styles';
import { TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import { isEditableValueType, type StorageAdapter } from '../../services/define-adapter.service';
import { setStorageValue } from '../../services/write-storage.service';
import type { StorageEntry } from '../../stores/storage.store';
import { parseStoredJson } from '../../utils/classify-value.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { TextArea } from '../../../../core/components/ui/text-area.ui';

export function EditTab({ entry, adapter }: { entry: StorageEntry; adapter: StorageAdapter }) {
  const detailStyles = useDetailStyles();
  const styles = useStyles();

  const [draft, setDraft] = useState(entry.text ?? '');
  const [savedText, setSavedText] = useState(entry.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The store re-reads the key after a save, so the entry arriving with new text is the signal that
  // the write landed — that's what resets the draft, rather than an effect chasing the prop.
  if (entry.text !== savedText) {
    setSavedText(entry.text);
    setDraft(entry.text ?? '');
    setError(null);
  }

  if (!adapter.canEdit) {
    return (
      <View style={detailStyles.section}>
        <Text style={detailStyles.emptyText}>
          {adapter.readOnly
            ? `${adapter.name} is registered read-only.`
            : `${adapter.name} was registered without a way to write.`}
        </Text>
      </View>
    );
  }

  if (!isEditableValueType(entry.valueType)) {
    return (
      <View style={detailStyles.section}>
        <Text style={detailStyles.emptyText}>A binary value cannot be edited here.</Text>
      </View>
    );
  }

  const jsonExpected = entry.kind === 'json-object' || entry.kind === 'json-array';
  const jsonBroken = jsonExpected && draft.trim().length > 0 && parseStoredJson(draft) === null;
  const dirty = draft !== (entry.text ?? '');

  async function save() {
    setSaving(true);
    setError(null);
    const message = await setStorageValue(entry, draft);
    setSaving(false);
    if (message !== null) setError(message);
  }

  return (
    <View style={detailStyles.section}>
      <Text style={detailStyles.note}>
        {entry.valueType === 'number'
          ? 'This key holds a number — it is written back as one.'
          : entry.valueType === 'boolean'
            ? 'This key holds a boolean — enter true or false.'
            : `Writes into ${adapter.name} under "${entry.key}".`}
      </Text>

      <TextArea value={draft} onChangeText={setDraft} minHeight={140} bordered />

      {/* A warning, not a block: a store is free to hold text that was never JSON. */}
      {jsonBroken && (
        <Text style={detailStyles.note}>
          This value was stored as JSON and what you've typed no longer parses. Saving it anyway is
          allowed.
        </Text>
      )}
      {error !== null && <Text style={detailStyles.error}>{error}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => {
            setDraft(entry.text ?? '');
            setError(null);
          }}
          disabled={!dirty || saving}
          style={styles.button}>
          <Text style={[styles.buttonLabel, (!dirty || saving) && styles.buttonLabelOff]}>
            Revert
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={save}
          disabled={!dirty || saving}
          style={[styles.button, styles.saveButton, (!dirty || saving) && styles.saveButtonOff]}>
          <Text style={styles.saveLabel}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    minHeight: TOUCH_TARGET.compact,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  buttonLabelOff: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
  },
  saveButtonOff: {
    opacity: 0.5,
  },
  saveLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
}));
