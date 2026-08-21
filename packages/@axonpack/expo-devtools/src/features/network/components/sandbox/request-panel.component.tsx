import { AuthSection } from './auth-section.component';
import { KeyValueTable } from './key-value-table.component';
import { NetworkConditionsSection } from './network-conditions-section.component';
import { useSandboxStyles } from './shared.styles';
import { buildCurlCommand } from '../../utils/curl.util';
import {
  buildAuthHeaders,
  buildFinalUrl,
  rowsToCookieHeader,
  rowsToRecord,
  type AuthConfig,
  type KeyValueRow,
} from '../../utils/sandbox.util';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { ReadOnlyTextInput } from '../../../../core/components/ui/read-only-text-input.ui';
import { TextArea } from '../../../../core/components/ui/text-area.ui';

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
  const sandboxStyles = useSandboxStyles();
  const cookieHeader = rowsToCookieHeader(cookieRows);
  const curlHeaders = {
    ...rowsToRecord(headerRows),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...buildAuthHeaders(auth),
  };

  return (
    <>
      <NetworkConditionsSection />
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
        <TextArea value={bodyText} onChangeText={onChangeBodyText} placeholder="Request body" />
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
