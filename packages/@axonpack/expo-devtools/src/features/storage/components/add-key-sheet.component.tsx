import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { Chip } from '../../../core/components/ui/chip.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { TextArea } from '../../../core/components/ui/text-area.ui';
import { TextField } from '../../../core/components/ui/text-field.ui';
import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import {
  creatableValueTypes,
  type StorageAdapter,
  type StorageValueType,
} from '../services/define-adapter.service';
import { createStorageKey } from '../services/write-storage.service';

const TYPE_LABELS: Record<StorageValueType, string> = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  buffer: 'Binary',
};

function initialValueFor(valueType: StorageValueType): string {
  return valueType === 'boolean' ? 'false' : '';
}

export function AddKeySheet({
  adapter,
  visible,
  onClose,
}: {
  adapter: StorageAdapter;
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useStyles();

  const types = creatableValueTypes(adapter);
  const firstType = types.includes('string') ? 'string' : (types[0] ?? 'string');

  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<StorageValueType>(firstType);
  const [draft, setDraft] = useState(() => initialValueFor(firstType));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);

  // Opening is what clears the form, not closing: a save that failed leaves what you typed on screen
  // to fix, and the sheet slides out with it rather than blanking mid-animation.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setKey('');
      setValueType(firstType);
      setDraft(initialValueFor(firstType));
      setError(null);
    }
  }

  function chooseType(next: StorageValueType) {
    setValueType(next);
    setDraft(initialValueFor(next));
    setError(null);
  }

  const numberBroken = valueType === 'number' && !Number.isFinite(Number(draft.trim()));
  const incomplete =
    key.trim().length === 0 || (valueType === 'number' && draft.trim().length === 0);

  async function add() {
    setSaving(true);
    setError(null);
    const message = await createStorageKey(adapter.id, key.trim(), draft, valueType);
    setSaving(false);
    if (message === null) onClose();
    else setError(message);
  }

  const blocked = incomplete || numberBroken || saving;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      headerContent={<Text style={styles.title}>Add a key to {adapter.name}</Text>}>
      <View style={styles.body}>
        <TextField label="Key" value={key} onChangeText={setKey} placeholder="Name the key" />

        {types.length > 1 && (
          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {types.map((current) => (
                <Chip
                  key={current}
                  label={TYPE_LABELS[current]}
                  active={current === valueType}
                  onPress={() => chooseType(current)}
                />
              ))}
            </View>
          </View>
        )}

        {valueType === 'boolean' ? (
          <View style={styles.field}>
            <Text style={styles.label}>Value</Text>
            <View style={styles.typeRow}>
              <Chip label="true" active={draft === 'true'} onPress={() => setDraft('true')} />
              <Chip label="false" active={draft === 'false'} onPress={() => setDraft('false')} />
            </View>
          </View>
        ) : valueType === 'number' ? (
          <TextField
            label="Value"
            value={draft}
            onChangeText={setDraft}
            placeholder="0"
            numeric
            invalid={draft.trim().length > 0 && numberBroken}
          />
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Value</Text>
            <TextArea value={draft} onChangeText={setDraft} minHeight={120} bordered />
          </View>
        )}

        {types.length === 1 && (
          <Text style={styles.note}>
            {adapter.name} holds {TYPE_LABELS[firstType].toLowerCase()} values only.
          </Text>
        )}
        {!adapter.canEnumerate && (
          // The tab reads a declared list for this store, so a key outside it is written but then
          // disappears on the next refresh — better said now than discovered then.
          <Text style={styles.note}>
            {adapter.name} cannot list its own keys, so a new key shows here until the next refresh
            unless it is one of the keys this store was registered with.
          </Text>
        )}
        {error !== null && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onClose} disabled={saving} style={styles.button}>
            <Text style={[styles.buttonLabel, saving && styles.buttonLabelOff]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={add}
            disabled={blocked}
            style={[styles.button, styles.addButton, blocked && styles.addButtonOff]}>
            <Text style={styles.addLabel}>{saving ? 'Adding…' : 'Add key'}</Text>
          </TouchableOpacity>
        </View>

        <InsetPadding edge="bottom" />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  body: {
    gap: 12,
    padding: 12,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.error,
  },
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
  addButton: {
    backgroundColor: COLORS.accent,
  },
  addButtonOff: {
    opacity: 0.5,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
}));
