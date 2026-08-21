import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { MethodSelector } from './method-selector.component';
import { RequestPanel } from './request-panel.component';
import { ResponsePanel } from './response-panel.component';
import { SandboxTabBar } from './sandbox-tab-bar.component';
import { SendButton } from './send-button.component';
import { UrlBar } from './url-bar.component';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import {
  buildAuthHeaders,
  buildFinalUrl,
  ensureTrailingBlankRow,
  extractAuthConfig,
  extractCookieHeader,
  newAuthConfig,
  parseCookieHeader,
  rowsFromRecord,
  rowsToCookieHeader,
  rowsToRecord,
  sendSandboxRequest,
  splitUrl,
  type AuthConfig,
  type KeyValueRow,
  type SandboxResult,
  type SandboxTab,
} from '../../utils/sandbox.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { BottomSheet } from '../../../../core/components/ui/bottom-sheet.ui';
import { InsetPadding } from '../../../../core/components/ui/inset-padding.ui';
import { SparkleIcon } from '../../../../core/components/ui/sparkle-icon.ui';

export function SandboxSheet({
  visible,
  entry,
  onClose,
}: {
  visible: boolean;
  entry: NetworkLogEntry | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const [prevVisible, setPrevVisible] = useState(false);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [auth, setAuth] = useState<AuthConfig>(() => newAuthConfig());
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>(() => ensureTrailingBlankRow([]));
  const [paramRows, setParamRows] = useState<KeyValueRow[]>(() => ensureTrailingBlankRow([]));
  const [cookieRows, setCookieRows] = useState<KeyValueRow[]>(() => ensureTrailingBlankRow([]));
  const [bodyText, setBodyText] = useState('');
  const [tab, setTab] = useState<SandboxTab>('request');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible && entry) {
      const { base, params } = splitUrl(entry.url);
      const { cookieValue, rest: withoutCookie } = extractCookieHeader(entry.requestHeaders);
      const { auth: seededAuth, rest } = extractAuthConfig(withoutCookie);
      setMethod(entry.method);
      setUrl(base);
      setAuth(seededAuth);
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
    Object.assign(headers, buildAuthHeaders(auth));
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
    <BottomSheet
      visible={visible}
      onClose={onClose}
      headerContent={
        <View style={styles.titleRow}>
          <SparkleIcon size={14} />
          <Text style={styles.title}>Sandbox</Text>
        </View>
      }>
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
            auth={auth}
            onChangeAuth={setAuth}
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
        <InsetPadding edge="bottom" />
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
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
}));
