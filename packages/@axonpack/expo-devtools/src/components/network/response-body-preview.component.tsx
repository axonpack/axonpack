import { Image, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import WebView from 'react-native-webview';

import { JsonTree } from '../json-tree';
import { CodeHighlight } from './detail-panel/code-highlight';
import type { JsonValue } from '../../utils/json-tree.util';
import { detectLanguage } from '../../utils/network/code-highlight.util';
import { makeThemedStyles } from '../../utils/themed-styles.util';

function parseJson(body: string): JsonValue | undefined {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function isImage(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().startsWith('image/') ?? false;
}

function isHtml(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().includes('html') ?? false;
}

function isSvg(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().includes('svg') ?? false;
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
}: {
  body: string | undefined;
  mimeType: string | undefined;
  url: string;
  emptyText: string;
  emptyTextStyle: StyleProp<TextStyle>;
}) {
  const styles = useStyles();
  if (isImage(mimeType)) {
    return <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />;
  }

  if (!body) return <Text style={emptyTextStyle}>{emptyText}</Text>;

  if (isHtml(mimeType)) {
    return <WebView source={{ html: body, baseUrl: url }} style={styles.webview} />;
  }

  if (isSvg(mimeType)) {
    return (
      <WebView source={{ html: wrapSvgDocument(body), baseUrl: url }} style={styles.webview} />
    );
  }

  const parsed = parseJson(body);
  if (parsed !== undefined) return <JsonTree value={parsed} />;
  return <CodeHighlight code={body} language={detectLanguage(mimeType, body)} />;
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
