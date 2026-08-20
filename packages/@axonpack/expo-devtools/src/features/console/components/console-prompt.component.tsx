import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { Chip } from '../../../core/components/ui/chip.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { getCompletions } from '../services/complete-expression.service';
import { runReplCommand } from '../services/run-repl-command.service';
import { consolePromptStore } from '../stores/console-prompt.store';
import { normalizeExpressionInput } from '../utils/normalize-expression.util';

export function ConsolePrompt({ onSubmit }: { onSubmit?: () => void }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const source = useSyncExternalStore(consolePromptStore.subscribe, consolePromptStore.getDraft);
  const focusRequest = useSyncExternalStore(
    consolePromptStore.subscribe,
    consolePromptStore.getFocusRequest
  );
  const inputRef = useRef<TextInput>(null);

  const lastFocusRequest = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === lastFocusRequest.current) return;
    lastFocusRequest.current = focusRequest;
    inputRef.current?.focus();
  }, [focusRequest]);

  const completion = useMemo(() => getCompletions(source), [source]);
  const canRun = source.trim().length > 0;

  function submit() {
    if (!canRun) return;

    onSubmit?.();

    runReplCommand(source);
    consolePromptStore.setDraft('');
  }

  function applyCompletion(option: string) {
    if (!completion) return;
    consolePromptStore.setDraft(source.slice(0, completion.start) + option);
  }

  return (
    <View style={styles.container}>
      {completion && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}

          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.suggestions}>
          {completion.options.map((option) => (
            <Chip
              key={option}
              label={option}
              active={false}
              onPress={() => applyCompletion(option)}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.row}>
        <MaterialIcons name="chevron-right" size={16} color={COLORS.accent} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={source}

          onChangeText={(text) => consolePromptStore.setDraft(normalizeExpressionInput(text))}
          onSubmitEditing={submit}
          placeholder="Run an expression"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="send"

          blurOnSubmit={false}
        />
        {source.length > 0 && (
          <TouchableOpacity
            onPress={() => consolePromptStore.setDraft('')}
            hitSlop={HIT_SLOP.dense}
            style={styles.action}>
            <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={submit}
          hitSlop={HIT_SLOP.dense}
          disabled={!canRun}
          style={styles.action}>
          <MaterialIcons
            name="play-arrow"
            size={20}
            color={canRun ? COLORS.accent : COLORS.border}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  suggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: TOUCH_TARGET.min,
  },

  action: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0,
  },
}));
