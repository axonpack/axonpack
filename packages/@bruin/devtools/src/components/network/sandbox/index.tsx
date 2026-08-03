import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { KeyValueTable } from './key-value-table.component';
import { sandboxStyles } from './shared.styles';
import { COLORS } from '../../../constants/colors.const';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { buildCurlCommand } from '../../../utils/network/curl.util';
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
} from '../../../utils/network/sandbox.util';
import { BottomSheet } from '../../ui/bottom-sheet.ui';
import { Chip } from '../../ui/chip.ui';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { ReadOnlyTextInput } from '../../ui/read-only-text-input.ui';
import { ResponseBodyPreview } from '../response-body-preview.component';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type SandboxTab = 'request' | 'response';

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

  const cookieHeader = rowsToCookieHeader(cookieRows);
  const curlHeaders = {
    ...rowsToRecord(headerRows),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Sandbox</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.methodScroll}
        contentContainerStyle={styles.methodRow}>
        {METHODS.map((m) => (
          <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
        ))}
      </ScrollView>

      <View style={styles.urlRow}>
        <TextInput
          style={styles.urlInput}
          value={url}
          onChangeText={setUrl}
          placeholder="https://api.example.com/path"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabBarRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'request' && styles.tabButtonActive]}
          onPress={() => setTab('request')}>
          <Text style={[styles.tabLabel, tab === 'request' && styles.tabLabelActive]}>Request</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'response' && styles.tabButtonActive]}
          onPress={() => setTab('response')}>
          <Text style={[styles.tabLabel, tab === 'response' && styles.tabLabelActive]}>
            {result?.ok ? `Response (${result.status})` : 'Response'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {tab === 'request' ? (
          <>
            <CollapsibleSection title="Query Parameters" count={paramRows.length - 1}>
              <KeyValueTable rows={paramRows} onChange={setParamRows} />
            </CollapsibleSection>
            <CollapsibleSection title="Headers" count={headerRows.length - 1}>
              <KeyValueTable rows={headerRows} onChange={setHeaderRows} />
            </CollapsibleSection>
            <CollapsibleSection title="Cookies" count={cookieRows.length - 1}>
              <KeyValueTable rows={cookieRows} onChange={setCookieRows} />
            </CollapsibleSection>
            <CollapsibleSection title="Body">
              <TextInput
                style={styles.bodyInput}
                value={bodyText}
                onChangeText={setBodyText}
                placeholder="Request body"
                placeholderTextColor={COLORS.textSecondary}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </CollapsibleSection>
            <CollapsibleSection title="Code Snippet">
              <ReadOnlyTextInput
                value={buildCurlCommand({
                  method,
                  url: buildFinalUrl(url, paramRows),
                  requestHeaders: curlHeaders,
                  requestBody: bodyText,
                })}
                style={sandboxStyles.codeSnippet}
              />
            </CollapsibleSection>
          </>
        ) : (
          <SandboxResponseView sending={sending} result={result} />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function SandboxResponseView({
  sending,
  result,
}: {
  sending: boolean;
  result: SandboxResult | null;
}) {
  if (sending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (!result) {
    return <Text style={sandboxStyles.emptyText}>Send a request to see the response here.</Text>;
  }

  if (!result.ok) {
    return (
      <View>
        <Text style={[styles.statusLine, { color: COLORS.error }]}>Request failed</Text>
        <Text style={styles.errorText} selectable>
          {result.error}
        </Text>
      </View>
    );
  }

  const statusColor = result.status >= 200 && result.status < 400 ? COLORS.success : COLORS.error;

  return (
    <View>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLine, { color: statusColor }]}>
          {result.status} {result.statusText}
        </Text>
        <Text style={styles.durationText}>{result.duration} ms</Text>
      </View>
      <CollapsibleSection title="Response Headers" count={Object.keys(result.headers).length}>
        {Object.entries(result.headers).map(([key, value]) => (
          <View key={key} style={sandboxStyles.row}>
            <Text style={styles.headerKey} selectable>
              {key}
            </Text>
            <Text style={styles.headerValue} selectable>
              {value}
            </Text>
          </View>
        ))}
      </CollapsibleSection>
      <CollapsibleSection title="Response Body">
        <ResponseBodyPreview
          body={result.body}
          mimeType={result.headers['content-type']}
          emptyText="Empty response body"
          emptyTextStyle={sandboxStyles.emptyText}
        />
      </CollapsibleSection>
    </View>
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
  methodScroll: {
    flexGrow: 0,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  urlInput: {
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
  tabBarRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.accent,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
  bodyInput: {
    minHeight: 100,
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLine: {
    fontSize: 13,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  headerKey: {
    width: 140,
    fontSize: 12,
    color: COLORS.keyAccent,
    fontWeight: '600',
  },
  headerValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
});
