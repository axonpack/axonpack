import type { Language, PrettyPrintTheme } from '@axonpack/react-pretty-print';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** All 38 languages as a wrapping row of chips — one panel is shown for whichever is selected. */
export function LanguagePicker({
  languages,
  selected,
  theme,
  onSelect,
}: {
  languages: Language[];
  selected: Language;
  theme: PrettyPrintTheme;
  onSelect: (language: Language) => void;
}) {
  return (
    <View style={styles.row}>
      {languages.map((language) => {
        const active = language === selected;
        return (
          <Pressable
            key={language}
            onPress={() => onSelect(language)}
            style={[styles.chip, { borderColor: active ? theme.key : theme.punctuation }]}>
            <Text
              style={[
                styles.label,
                { color: active ? theme.key : theme.punctuation, fontFamily: theme.fontFamily },
              ]}>
              {language}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  label: { fontSize: 11 },
});
