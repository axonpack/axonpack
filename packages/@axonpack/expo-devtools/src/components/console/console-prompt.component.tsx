import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { getCompletions } from '../../services/console/complete-expression.service';
import { runReplCommand } from '../../services/console/run-repl-command.service';
import { consolePromptStore } from '../../stores/console/console-prompt.store';
import { normalizeExpressionInput } from '../../utils/console/normalize-expression.util';
import { Chip } from '../ui/chip.ui';

export function ConsolePrompt({ onSubmit }: { onSubmit?: () => void }) {
  const source = useSyncExternalStore(consolePromptStore.subscribe, consolePromptStore.getDraft);
  const focusRequest = useSyncExternalStore(
    consolePromptStore.subscribe,
    consolePromptStore.getFocusRequest
  );
  const inputRef = useRef<TextInput>(null);

  // Skips the first render — mount shouldn't pop the keyboard, only an actual recall should.
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
    // Ahead of the run so the rows it adds land while the list is already following the tail.
    onSubmit?.();
    // Handed over raw — `runReplCommand` normalizes and trims, so the echoed row and the code that
    // runs can't drift apart.
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
          // Without "always", the first tap only dismisses the keyboard and the chip never fires.
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
          // Normalized here rather than at evaluation, so what you see in the field is what runs.
          onChangeText={(text) => consolePromptStore.setDraft(normalizeExpressionInput(text))}
          onSubmitEditing={submit}
          placeholder="Run an expression"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="send"
          // Keeps the keyboard up so a second command doesn't need another tap into the field.
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

const styles = StyleSheet.create({
  // Docked to the bottom of the tab rather than floating inside it, so it gets a single top
  // separator instead of the bordered, rounded box `INPUT_STYLES.md` describes for inline inputs.
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  suggestions: {
    flexDirection: 'row',
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
  // Sized to the docked row rather than to 44, which would make the prompt taller than the keyboard's
  // own accessory bar; the row's height plus the slop above is what carries the target.
  action: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
    color: COLORS.textPrimary,
    // RN adds default vertical padding to TextInput; zero it so it aligns with the row.
    padding: 0,
  },
});
