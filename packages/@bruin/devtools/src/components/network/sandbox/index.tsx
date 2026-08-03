import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { MethodSelector } from './method-selector.component';
import { RequestPanel } from './request-panel.component';
import { ResponsePanel } from './response-panel.component';
import { SandboxTabBar } from './sandbox-tab-bar.component';
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
      <Text style={styles.title}>Sandbox</Text>

      <MethodSelector method={method} onChange={setMethod} />
      <UrlBar url={url} onChangeUrl={setUrl} sending={sending} onSend={handleSend} />
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
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
});
