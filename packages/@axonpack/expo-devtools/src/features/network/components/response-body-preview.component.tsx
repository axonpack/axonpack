import { Image, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import WebView from 'react-native-webview';

import { CodeHighlight } from './detail-panel/code-highlight';
import { JsonTree } from '../../../core/components/json-tree';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import type { Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { detectLanguage } from '../utils/code-highlight.util';
import { classifyPreview } from '../utils/preview-kind.util';

function parseJson(body: string): JsonValue | undefined {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function wrapSvgDocument(svg: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">${svg}</body></html>`;
}

export function ResponseBodyPreview({
  body,
  base64,
  mimeType,
  url,
  emptyText,
  emptyTextStyle,
  matcher = null,
}: {
  body: string | undefined;
  /** The captured bytes, when the body was not text. Preferred over the URL — see below. */
  base64: string | undefined;
  mimeType: string | undefined;
  url: string;
  emptyText: string;
  emptyTextStyle: StyleProp<TextStyle>;
  matcher?: Matcher | null;
}) {
  const styles = useStyles();
  const kind = classifyPreview(mimeType);

  if (kind === 'image') {
    // The captured bytes first, and the URL only as a fallback. Re-requesting the URL sends a second
    // request without the original's headers — which an authenticated endpoint refuses — and our own
    // patches log it, so opening a preview used to add a row to the log you were reading.
    const uri = base64 && mimeType ? `data:${mimeType};base64,${base64}` : url;
    return <Image source={{ uri }} style={styles.image} resizeMode="contain" />;
  }

  if (!body) return <Text style={emptyTextStyle}>{emptyText}</Text>;

  if (kind === 'webview') {
    const html = mimeType?.toLowerCase().includes('html') ? body : wrapSvgDocument(body);
    return (
      <WebView
        source={{ html, baseUrl: url }}
        style={styles.webview}
        // A response body is untrusted markup, and both defaults point the wrong way for a preview:
        // script inside the body would run, and a tapped link that misses `originWhitelist` is handed
        // to the system browser rather than refused. So scripts are off and only the document itself
        // may navigate — iOS asks about that one with the base URL, Android never asks about it.
        javaScriptEnabled={false}
        onShouldStartLoadWithRequest={(request) =>
          request.url === url || !/^https?:/i.test(request.url)
        }
      />
    );
  }

  const parsed = parseJson(body);
  if (parsed !== undefined) return <JsonTree value={parsed} matcher={matcher} />;
  return <CodeHighlight code={body} language={detectLanguage(mimeType, body)} matcher={matcher} />;
}

const useStyles = makeThemedStyles((COLORS) => ({
  image: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
  },
  webview: {
    height: 320,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
}));
