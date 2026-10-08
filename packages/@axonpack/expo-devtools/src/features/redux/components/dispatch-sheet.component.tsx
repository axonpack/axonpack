import { useState } from 'react';
import { Keyboard, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { TextArea } from '../../../core/components/ui/text-area.ui';
import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { reduxStore } from '../stores/redux.store';
import { parseTypedAction } from '../utils/format-redux.util';

/** Dispatch an action typed as JSON. It runs through the app's own store and reducer. */
export function DispatchSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const parsed = parseTypedAction(text);

  function submit() {
    if (!parsed.action) return;
    const message = reduxStore.dispatch(parsed.action);
    if (message === null) {
      // The sheet closing does not blur the field, so the keyboard would stay up over the list.
      Keyboard.dismiss();
      onClose();
    } else setError(message);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      headerContent={<Text style={styles.title}>Dispatch an action</Text>}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Action (JSON)</Text>
          <TextArea
            value={text}
            onChangeText={(next) => {
              setText(next);
              setError(null);
            }}
            placeholder='{ "type": "counter/increment", "payload": 1 }'
            minHeight={96}
            bordered
          />
        </View>
        <TouchableOpacity
          style={[styles.button, !parsed.action && styles.buttonOff]}
          disabled={!parsed.action}
          onPress={submit}>
          <Text style={styles.buttonLabel}>Dispatch</Text>
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
  error: {
    fontSize: 12,
    color: COLORS.error,
  },
}));
