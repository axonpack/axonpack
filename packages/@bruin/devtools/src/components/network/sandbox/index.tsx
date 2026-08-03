import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MethodSelector } from './method-selector.component';
import { RequestPanel } from './request-panel.component';
import { ResponsePanel } from './response-panel.component';
import { SandboxTabBar } from './sandbox-tab-bar.component';
import { SendButton } from './send-button.component';
import { UrlBar } from './url-bar.component';
import { COLORS } from '../../../constants/colors.const';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import {
  buildFinalUrl,
  ensureTrailingBlankRow,
  extractCookieHeader,
  parseCookieHeader,
  rowsFromRecord,
  rowsToCookieHeader,
  rowsToRecord,
  sendSandboxRequest,
  splitUrl,
  type KeyValueRow,
  type SandboxResult,
  type SandboxTab,
} from '../../../utils/network/sandbox.util';
import { BottomSheet } from '../../ui/bottom-sheet.ui';
import { SparkleIcon } from '../../ui/sparkle-icon.ui';

export function SandboxSheet({
  visible,
  entry,
  onClose,
}: {
  visible: boolean;
  entry: NetworkLogEntry | null;
  onClose: () => void;
}) {
  const [prevVisible, setPrevVisible] = useState(false);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>(() => ensureTrailingBlankRow([]));
  const [paramRows, setParamRows] = useState<KeyValueRow[]>(() => ensureTrailingBlankRow([]));
  const [cookieRows, setCookieRows] = useState<KeyValueRow[]>(() => ensureTrailingBlankRow([]));
  const [bodyText, setBodyText] = useState('');
  const [tab, setTab] = useState<SandboxTab>('request');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);

  // Re-seed every field from `entry` each time the sheet opens, rather than mirroring it via an
  // effect (see https://react.dev/learn/you-might-not-need-an-effect).
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible && entry) {
      const { base, params } = splitUrl(entry.url);
      const { cookieValue, rest } = extractCookieHeader(entry.requestHeaders);
      setMethod(entry.method);
      setUrl(base);
      setParamRows(params);
      setHeaderRows(rowsFromRecord(rest));
      setCookieRows(parseCookieHeader(cookieValue));
      setBodyText(entry.requestBody ?? '');
      setTab('request');
      setResult(null);
    }
  }

  async function handleSend() {
    setSending(true);
    const headers = rowsToRecord(headerRows);
    const cookieHeader = rowsToCookieHeader(cookieRows);
    if (cookieHeader) headers.Cookie = cookieHeader;
    const response = await sendSandboxRequest({
      method,
      url: buildFinalUrl(url, paramRows),
      headers,
      body: bodyText,
    });
    setSending(false);
    setResult(response);
    setTab('response');
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.titleRow}>
        <SparkleIcon size={14} />
        <Text style={styles.title}>Sandbox</Text>
      </View>

      <UrlBar url={url} onChangeUrl={setUrl} />
      <View style={styles.actionRow}>
        <MethodSelector method={method} onChange={setMethod} />
        <SendButton sending={sending} onPress={handleSend} />
      </View>
      <SandboxTabBar
        tab={tab}
        onChange={setTab}
        responseStatus={result?.ok ? result.status : undefined}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {tab === 'request' ? (
          <RequestPanel
            method={method}
            url={url}
            paramRows={paramRows}
            onChangeParamRows={setParamRows}
            headerRows={headerRows}
            onChangeHeaderRows={setHeaderRows}
            cookieRows={cookieRows}
            onChangeCookieRows={setCookieRows}
            bodyText={bodyText}
            onChangeBodyText={setBodyText}
          />
        ) : (
          <ResponsePanel sending={sending} result={result} />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
});
