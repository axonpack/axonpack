import { useSyncExternalStore } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { SocketMessageRow } from './socket-message-row.component';
import { BottomSheet } from '../../../core/components/ui/bottom-sheet.ui';
import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import {
  networkLogStore,
  type WebSocketLogEntry,
  type WebSocketMessage,
} from '../stores/network-log.store';

function keyExtractor(message: WebSocketMessage): string {
  return message.id;
}

export function SocketDetailPanel({
  entry,
  onClose,
}: {
  entry: WebSocketLogEntry | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  // Subscribed rather than passed in: a socket stays open, so its messages arrive while this is on
  // screen. Reading the id off the entry keeps the list pointed at the same socket across updates.
  const messages = useSyncExternalStore(networkLogStore.subscribe, () =>
    entry ? networkLogStore.getWebSocketMessages(entry.id) : EMPTY
  );

  return (
    <BottomSheet
      visible={entry !== null}
      onClose={onClose}
      headerContent={
        entry && (
          <View style={styles.header}>
            <Text style={styles.url} numberOfLines={2} selectable>
              {entry.url}
            </Text>
            <View style={styles.badges}>
              <InfoBadge label={entry.status.toUpperCase()} />
              <InfoBadge icon="swap-vert" label={`${messages.length} msg`} />
              {entry.protocols?.length ? <InfoBadge label={entry.protocols.join(', ')} /> : null}
              {entry.closeCode !== undefined && <InfoBadge label={`code ${entry.closeCode}`} />}
              {entry.closeReason ? <InfoBadge label={entry.closeReason} /> : null}
              {entry.error !== undefined && <InfoBadge icon="error-outline" label={entry.error} />}
            </View>
          </View>
        )
      }>
      {messages.length === 0 ? (
        <Text style={styles.empty}>No messages yet.</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      )}
    </BottomSheet>
  );
}

const EMPTY: readonly WebSocketMessage[] = [];

function renderMessage({ item }: { item: WebSocketMessage }) {
  return <SocketMessageRow message={item} />;
}

const useStyles = makeThemedStyles((COLORS) => ({
  header: {
    gap: 6,
    paddingBottom: 4,
  },
  url: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  empty: {
    padding: 16,
    fontSize: 12,
    color: COLORS.textSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
}));
