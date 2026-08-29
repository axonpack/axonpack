import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { applyStorageImport, type StorageImportResult } from '../services/import-storage.service';
import type { StorageAdapter } from '../services/define-adapter.service';
import type { StorageEntry } from '../stores/storage.store';
import {
  parseStorageExport,
  planStorageImport,
  type StorageImportPlan,
} from '../utils/build-storage-export.util';
import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { Chip } from '../../../core/components/ui/chip.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { TextArea } from '../../../core/components/ui/text-area.ui';
import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';

type Reading =
  | { state: 'empty' }
  | { state: 'unreadable'; message: string }
  | { state: 'read'; plan: StorageImportPlan };

const SKIP_REASONS = {
  hidden: 'hidden by the blacklist',
  unsupported: 'a type this store does not hold',
  empty: 'no value to write',
} as const;

function read(text: string, adapter: StorageAdapter, entries: readonly StorageEntry[]): Reading {
  if (text.trim().length === 0) return { state: 'empty' };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      state: 'unreadable',
      message: `Not JSON — ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const parsed = parseStorageExport(raw);
  if (!parsed.ok) return { state: 'unreadable', message: `${parsed.path} — ${parsed.message}` };

  return { state: 'read', plan: planStorageImport(parsed.file, adapter, entries) };
}

export function ImportSheet({
  adapter,
  entries,
  visible,
  onClose,
}: {
  adapter: StorageAdapter;
  entries: readonly StorageEntry[];
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useStyles();

  const [text, setText] = useState('');
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<StorageImportResult | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setText('');
      setResult(null);
    }
  }

  // Parsing on every keystroke is fine for a paste and pointless to debounce: the text arrives in one
  // go, and a file large enough to feel it is a file nobody typed by hand.
  const reading = useMemo(() => read(text, adapter, entries), [text, adapter, entries]);
  const plan = reading.state === 'read' ? reading.plan : null;
  const writeCount = plan === null ? 0 : plan.create.length + plan.overwrite.length;

  async function paste() {
    setText(await Clipboard.getStringAsync());
    setResult(null);
  }

  async function apply() {
    if (plan === null) return;
    setApplying(true);
    setResult(await applyStorageImport(adapter.id, plan));
    setApplying(false);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      headerContent={<Text style={styles.title}>Import into {adapter.name}</Text>}>
      <View style={styles.body}>
        <Text style={styles.note}>
          Paste a snapshot this tab exported. Nothing is written until you say so, and what it would
          do is worked out first.
        </Text>

        <View style={styles.chipRow}>
          <Chip label="Paste" icon="content-paste" active={false} onPress={paste} />
          {text.length > 0 && (
            <Chip
              label="Clear"
              icon="close"
              active={false}
              onPress={() => {
                setText('');
                setResult(null);
              }}
            />
          )}
        </View>

        <TextArea
          value={text}
          onChangeText={(next) => {
            setText(next);
            setResult(null);
          }}
          placeholder='{ "schemaVersion": 1, … }'
          minHeight={110}
          bordered
        />

        {reading.state === 'unreadable' && <Text style={styles.error}>{reading.message}</Text>}

        {plan !== null && (
          <View style={styles.plan}>
            {plan.differentStore && (
              <Text style={styles.warning}>
                This file came from {plan.fromStore}, not {adapter.name}. Importing it anyway is
                allowed.
              </Text>
            )}
            <Text style={styles.planLine}>
              {plan.create.length} new · {plan.overwrite.length} overwritten ·{' '}
              {plan.unchanged.length} already match
            </Text>
            {plan.skipped.length > 0 && (
              <Text style={styles.note}>
                {plan.skipped.length} skipped —{' '}
                {[...new Set(plan.skipped.map((skip) => SKIP_REASONS[skip.reason]))].join(', ')}
              </Text>
            )}
          </View>
        )}

        {result !== null && (
          <View style={styles.plan}>
            {result.error !== null ? (
              <Text style={styles.error}>{result.error}</Text>
            ) : (
              <Text style={styles.planLine}>
                Wrote {result.written} {result.written === 1 ? 'key' : 'keys'}.
              </Text>
            )}
            {result.failures.map((failure) => (
              <Text key={failure.key} style={styles.error}>
                {failure.key} — {failure.message}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onClose} disabled={applying} style={styles.button}>
            <Text style={[styles.buttonLabel, applying && styles.buttonLabelOff]}>
              {result !== null && result.failures.length === 0 && result.error === null
                ? 'Done'
                : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={apply}
            disabled={writeCount === 0 || applying}
            style={[
              styles.button,
              styles.applyButton,
              (writeCount === 0 || applying) && styles.applyButtonOff,
            ]}>
            <Text style={styles.applyLabel}>
              {applying
                ? 'Writing…'
                : writeCount === 0
                  ? 'Nothing to write'
                  : `Write ${writeCount}`}
            </Text>
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
    gap: 10,
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  plan: {
    gap: 4,
  },
  planLine: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  warning: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.warning,
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
  applyButton: {
    backgroundColor: COLORS.accent,
  },
  applyButtonOff: {
    opacity: 0.5,
  },
  applyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
}));
