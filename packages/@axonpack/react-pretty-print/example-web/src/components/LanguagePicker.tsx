import type { Language, PrettyPrintTheme } from '@axonpack/react-pretty-print';

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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
      {languages.map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => onSelect(language)}
          style={{
            padding: '3px 8px',
            fontSize: 11,
            fontFamily: theme.fontFamily,
            borderRadius: 4,
            cursor: 'pointer',
            background: 'transparent',
            color: language === selected ? theme.key : theme.punctuation,
            border: `1px solid ${language === selected ? theme.key : theme.punctuation}`,
          }}>
          {language}
        </button>
      ))}
    </div>
  );
}
