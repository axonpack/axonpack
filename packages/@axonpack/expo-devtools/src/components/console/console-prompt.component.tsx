import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { getCompletions } from '../../services/console/complete-expression.service';
import { runReplCommand } from '../../services/console/run-repl-command.service';
import { normalizeExpressionInput } from '../../utils/console/normalize-expression.util';
import { Chip } from '../ui/chip.ui';

export function ConsolePrompt({ onSubmit }: { onSubmit?: () => void }) {
  const [source, setSource] = useState('');

  const completion = useMemo(() => getCompletions(source), [source]);
  const canRun = source.trim().length > 0;

  function submit() {
    if (!canRun) return;
    // Ahead of the run so the rows it adds land while the list is already following the tail.
    onSubmit?.();
    runReplCommand(source.trim());
    setSource('');
  }

  function applyCompletion(option: string) {
    if (!completion) return;
    setSource(source.slice(0, completion.start) + option);
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
          style={styles.input}
          value={source}
          // Normalized here rather than at evaluation, so what you see in the field is what runs.
          onChangeText={(text) => setSource(normalizeExpressionInput(text))}
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
          <TouchableOpacity onPress={() => setSource('')} hitSlop={8}>
            <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={submit} hitSlop={8} disabled={!canRun}>
          <MaterialIcons
            name="play-arrow"
            size={18}
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
    paddingVertical: 10,
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
