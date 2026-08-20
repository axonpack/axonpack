import { Image, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import WebView from 'react-native-webview';

import { CodeHighlight } from './detail-panel/code-highlight';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { detectLanguage } from '../utils/code-highlight.util';
import { classifyPreview } from '../utils/preview-kind.util';
import type { Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { JsonTree } from '../../../core/components/json-tree';

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
  mimeType,
  url,
  emptyText,
  emptyTextStyle,
  matcher = null,
}: {
  body: string | undefined;
  mimeType: string | undefined;
  url: string;
  emptyText: string;
  emptyTextStyle: StyleProp<TextStyle>;
  matcher?: Matcher | null;
}) {
  const styles = useStyles();
  const kind = classifyPreview(mimeType);

  if (kind === 'image') {
    return <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />;
  }

  if (!body) return <Text style={emptyTextStyle}>{emptyText}</Text>;

  if (kind === 'webview') {
    const html = mimeType?.toLowerCase().includes('html') ? body : wrapSvgDocument(body);
    return <WebView source={{ html, baseUrl: url }} style={styles.webview} />;
  }

  const parsed = parseJson(body);
  if (parsed !== undefined) return <JsonTree value={parsed} matcher={matcher} />;
  return <CodeHighlight code={body} language={detectLanguage(mimeType, body)} matcher={matcher} />;
}

const useStyles = makeThemedStyles((COLORS) => ({
  image: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.toolbarBackground,
    borderRadius: 6,
  },
  webview: {
    height: 320,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
}));
