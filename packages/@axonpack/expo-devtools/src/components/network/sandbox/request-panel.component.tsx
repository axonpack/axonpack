import { StyleSheet, TextInput } from 'react-native';

import { AuthSection } from './auth-section.component';
import { KeyValueTable } from './key-value-table.component';
import { sandboxStyles } from './shared.styles';
import { COLORS } from '../../../constants/colors.const';
import { buildCurlCommand } from '../../../utils/network/curl.util';
import {
  buildAuthHeaders,
  buildFinalUrl,
  rowsToCookieHeader,
  rowsToRecord,
  type AuthConfig,
  type KeyValueRow,
} from '../../../utils/network/sandbox.util';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { ReadOnlyTextInput } from '../../ui/read-only-text-input.ui';

export function RequestPanel({
  method,
  url,
  auth,
  onChangeAuth,
  paramRows,
  onChangeParamRows,
  headerRows,
  onChangeHeaderRows,
  cookieRows,
  onChangeCookieRows,
  bodyText,
  onChangeBodyText,
}: {
  method: string;
  url: string;
  auth: AuthConfig;
  onChangeAuth: (auth: AuthConfig) => void;
  paramRows: KeyValueRow[];
  onChangeParamRows: (rows: KeyValueRow[]) => void;
  headerRows: KeyValueRow[];
  onChangeHeaderRows: (rows: KeyValueRow[]) => void;
  cookieRows: KeyValueRow[];
  onChangeCookieRows: (rows: KeyValueRow[]) => void;
  bodyText: string;
  onChangeBodyText: (text: string) => void;
}) {
  const cookieHeader = rowsToCookieHeader(cookieRows);
  const curlHeaders = {
    ...rowsToRecord(headerRows),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...buildAuthHeaders(auth),
  };

  return (
    <>
      <AuthSection auth={auth} onChange={onChangeAuth} />
      <CollapsibleSection title="Query Parameters" count={paramRows.length - 1}>
        <KeyValueTable rows={paramRows} onChange={onChangeParamRows} />
      </CollapsibleSection>
      <CollapsibleSection title="Headers" count={headerRows.length - 1}>
        <KeyValueTable rows={headerRows} onChange={onChangeHeaderRows} />
      </CollapsibleSection>
      <CollapsibleSection title="Cookies" count={cookieRows.length - 1}>
        <KeyValueTable rows={cookieRows} onChange={onChangeCookieRows} />
      </CollapsibleSection>
      <CollapsibleSection title="Body">
        <TextInput
          style={styles.bodyInput}
          value={bodyText}
          onChangeText={onChangeBodyText}
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
  );
}

const styles = StyleSheet.create({
  bodyInput: {
    minHeight: 100,
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
});
