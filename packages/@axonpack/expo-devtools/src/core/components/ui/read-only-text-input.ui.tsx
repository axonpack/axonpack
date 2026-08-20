import { StyleSheet, TextInput, type TextStyle } from 'react-native';

function blockEdits() {}

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
