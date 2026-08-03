import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '../../../constants/colors.const';

export function UrlBar({
  url,
  onChangeUrl,
  sending,
  onSend,
}: {
  url: string;
  onChangeUrl: (url: string) => void;
  sending: boolean;
  onSend: () => void;
}) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={onChangeUrl}
        placeholder="https://api.example.com/path"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={sending}>
        {sending ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.sendButtonText}>Send</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
