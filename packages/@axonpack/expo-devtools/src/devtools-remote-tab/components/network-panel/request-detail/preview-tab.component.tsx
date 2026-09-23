import { CodeHighlight, XmlTree, detectLanguage } from '@axonpack/react-pretty-print';

import { JsonTree } from './json-tree.component';
import { TAB_PRIMITIVES } from './tab-primitives.component';
import { themeStore, useThemeStore } from '../../../../core/stores/theme.store';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';
import { prettyPrintTheme } from '../../../utils/pretty-print-theme.util';

function parseJson(body: string): JsonValue | undefined {
  try {
    return JSON.parse(body) as JsonValue;
  } catch {
    return undefined;
  }
}

/** What the app's Preview draws for the body: a picture, a page, a JSON or XML tree, or the code. */
export function PreviewTab({ entry }: { entry: NetworkLogEntry }) {
  const theme = prettyPrintTheme(useThemeStore(themeStore.getPalette));
  const mime = entry.mimeType?.toLowerCase() ?? '';

  if (entry.responseBase64 && mime.startsWith('image/')) {
    return (
      <div className="axonpack-net-preview-image">
        <img src={`data:${mime};base64,${entry.responseBase64}`} alt="" />
      </div>
    );
  }
  if (!entry.responseBody) {
    return <p className="axonpack-net-none">No preview available.</p>;
  }
  if (mime.includes('html')) {
    // Sandboxed with nothing allowed: the page is drawn, and its scripts, forms and links do nothing.
    return <iframe className="axonpack-net-preview-page" sandbox="" srcDoc={entry.responseBody} />;
  }

  const json = parseJson(entry.responseBody);
  if (json !== undefined && typeof json === 'object' && json !== null) {
    return <JsonTree value={json} />;
  }
  if (mime.includes('xml')) {
    return (
      <div className="axonpack-json">
        <XmlTree primitives={TAB_PRIMITIVES} source={entry.responseBody} theme={theme} />
      </div>
    );
  }
  return (
    <div className="axonpack-json">
      <CodeHighlight
        primitives={TAB_PRIMITIVES}
        code={entry.responseBody}
        language={detectLanguage(entry.mimeType, entry.responseBody)}
        theme={theme}
      />
    </div>
  );
}
