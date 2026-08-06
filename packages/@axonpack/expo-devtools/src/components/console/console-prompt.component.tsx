import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { runReplCommand } from '../../services/console/run-repl-command.service';

export function ConsolePrompt() {
  const [source, setSource] = useState('');

  function submit() {
    const trimmed = source.trim();
    if (trimmed.length === 0) return;
    runReplCommand(trimmed);
    setSource('');
  }

  return (
    <View style={styles.row}>
      <MaterialIcons name="chevron-right" size={16} color={COLORS.accent} />
      <TextInput
        style={styles.input}
        value={source}
        onChangeText={setSource}
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
      <TouchableOpacity onPress={submit} hitSlop={8} disabled={source.trim().length === 0}>
        <MaterialIcons
          name="play-arrow"
          size={18}
          color={source.trim().length > 0 ? COLORS.accent : COLORS.border}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
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
