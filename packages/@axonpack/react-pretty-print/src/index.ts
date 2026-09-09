/**
 * The published surface. Explicit named re-exports rather than a starred `./components` plus
 * `./utils`, because those two collide: `XmlNode` is a renderer in one and the parsed-node type in
 * the other. Being explicit also keeps the internal `JsonNode`/`XmlNode` renderers and the style
 * builders out of the API, even though their own layer barrels expose them to the rest of `src`.
 *
 * The palettes are deliberately absent: 130 of them is ~52KB, and a consumer that only wants a
 * renderer should not pull that in to find out it didn't need it. They have their own entry point,
 * `@axonpack/react-pretty-print/themes`, alongside `PrettyPrintTheme` itself.
 */
export { CodeHighlight, domPrimitives, JsonTree, XmlTree } from './components';
export type {
  CodeHighlightProps,
  JsonTreeProps,
  MenuItem,
  Primitives,
  XmlTreeProps,
} from './components';

export {
  ARRAY_CHUNK_SIZE,
  buildPreview,
  chunkArrayRange,
  collectExpandablePaths,
  detectLanguage,
  formatCode,
  formatCopyValue,
  hasChildren,
  isExpandable,
  isPlainObject,
  MAX_HIGHLIGHT_LENGTH,
  parseXml,
  SUPPORTED_LANGUAGES,
  tokenize,
} from './utils';
export type {
  JsonValue,
  Language,
  Token,
  TokenType,
  XmlCData,
  XmlElement,
  XmlNode,
  XmlParseResult,
  XmlText,
} from './utils';
