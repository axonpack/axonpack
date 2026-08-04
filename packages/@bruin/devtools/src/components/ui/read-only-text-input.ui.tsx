import { StyleSheet, TextInput, type TextStyle } from 'react-native';

function blockEdits() {
  // Controlled TextInput with a no-op onChangeText: any keystroke gets discarded on
  // re-render since the value always snaps back to the prop, but cursor movement,
  // selection, and copy still work natively — unlike `editable={false}`, which blocks those too.
}

export function ReadOnlyTextInput({
  value,
  style,
}: {
  value: string;
  style?: TextStyle | TextStyle[];
}) {
  return (
    <TextInput
      style={[styles.input, style]}
      value={value}
      onChangeText={blockEdits}
      multiline
      editable
      scrollEnabled={false}
      showSoftInputOnFocus={false}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    textAlignVertical: 'top',
  },
});
