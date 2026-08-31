import { KEYWORDS } from './languages.const';

export type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'tag'
  | 'attr-name'
  | 'attr-value'
  | 'property'
  | 'selector'
  | 'punctuation'
  | 'plain';

export type Token = { type: TokenType; text: string };

type Rule = { type: TokenType; pattern: RegExp };

export type Language =
  // Braces, semicolons, `//` line comments.
  | 'javascript'
  | 'typescript'
  | 'tsx'
  | 'java'
  | 'kotlin'
  | 'swift'
  | 'go'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'dart'
  | 'scala'
  | 'protobuf'
  // `#` line comments.
  | 'python'
  | 'ruby'
  | 'bash'
  | 'dockerfile'
  | 'makefile'
  | 'graphql'
  // Key-and-value formats.
  | 'yaml'
  | 'toml'
  | 'ini'
  | 'properties'
  | 'json'
  | 'json5'
  // Angle brackets.
  | 'html'
  | 'xml'
  | 'svg'
  | 'markdown'
  // Stylesheets.
  | 'css'
  | 'scss'
  | 'less'
  // Line-oriented.
  | 'sql'
  | 'diff'
  | 'log'
  | 'plain';

export const MAX_HIGHLIGHT_LENGTH = 50_000;

// ------------------------------------------------------------------- detection

const MIME_LANGUAGES: [RegExp, Language][] = [
  [/typescript|tsx/, 'typescript'],
  [/javascript|ecmascript|jscript/, 'javascript'],
  [/json5/, 'json5'],
  [/json/, 'json'],
  [/scss/, 'scss'],
  [/[/.+-]less/, 'less'],
  [/css/, 'css'],
  [/svg/, 'svg'],
  [/html|xhtml/, 'html'],
  [/xml/, 'xml'],
  [/markdown/, 'markdown'],
  [/yaml/, 'yaml'],
  [/toml/, 'toml'],
  [/graphql/, 'graphql'],
  [/x-sh|shellscript|x-bash|x-zsh/, 'bash'],
  [/x-python/, 'python'],
  [/x-ruby/, 'ruby'],
  [/x-java(?!script)/, 'java'],
  [/x-kotlin/, 'kotlin'],
  [/x-swift/, 'swift'],
  [/x-go\b|x-golang/, 'go'],
  [/x-rust/, 'rust'],
  [/x-c\+\+|x-cpp/, 'cpp'],
  [/x-csharp/, 'csharp'],
  [/x-csrc|x-chdr/, 'c'],
  [/x-php|x-httpd-php/, 'php'],
  [/x-dart/, 'dart'],
  [/x-scala/, 'scala'],
  [/x-sql|\bsql\b/, 'sql'],
  [/protobuf|x-proto/, 'protobuf'],
  [/x-diff|x-patch/, 'diff'],
  [/x-dockerfile/, 'dockerfile'],
  [/x-makefile/, 'makefile'],
  [/x-java-properties/, 'properties'],
  [/x-ini/, 'ini'],
];

/**
 * Only reached when the content type is absent or unhelpful, which is the common case — plenty of
 * servers label everything `text/plain` or `application/octet-stream`. Ordered most specific first.
 */
function detectFromContent(body: string): Language {
  const trimmed = body.trimStart();
  if (/^(<!doctype html|<html)/i.test(trimmed)) return 'html';
  if (/^<svg\b/i.test(trimmed)) return 'svg';
  if (/^(<\?xml|<)/.test(trimmed)) return 'xml';
  if (/^(diff --git|@@ |index [0-9a-f]{7})/.test(trimmed)) return 'diff';
  // Before the JSON check, and stricter than a lone section header: `[server]` and `[1, 2]` are
  // both `[`-initial, so an INI file has to show a `key =` line as well to win.
  if (/^\[[\w.$-]+\]\s*$/m.test(trimmed) && /^[\w.$-]+\s*=/m.test(trimmed)) return 'ini';
  if (/^[{[]/.test(trimmed)) return 'json';
  if (/^#!.*\b(bash|sh|zsh)\b/.test(trimmed)) return 'bash';
  if (/^#!.*python/.test(trimmed)) return 'python';
  if (/^(#{1,6} |```)/.test(trimmed)) return 'markdown';
  if (/^[.#@a-zA-Z][^{}]{0,80}\{[^}]*:[^}]*\}/.test(trimmed)) return 'css';
  if (/^---\s*$|^\s*[\w-]+:\s/m.test(trimmed)) return 'yaml';
  return 'plain';
}

export function detectLanguage(mimeType: string | undefined, body: string): Language {
  const mime = mimeType?.toLowerCase() ?? '';
  for (const [pattern, language] of MIME_LANGUAGES) {
    if (pattern.test(mime)) return language;
  }
  return detectFromContent(body);
}

// --------------------------------------------------------------- rule families

const NUMBER = /^\b0[xXbBoO][\da-fA-F_]+\b|^\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?[a-z%]*\b/;
const IDENTIFIER = /^[a-zA-Z_$][\w$]*/;
const CALL = /^[a-zA-Z_$][\w$]*(?=\s*\()/;
const WHITESPACE = /^\s+/;
const OPERATOR =
  /^(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|::|->|<-|\.\.\.|[+\-*/%=<>!&|^~?:.,;()[\]{}@])/;
const QUOTED = /^(['"`])(?:\\.|(?!\1).)*\1/;

/** Dynamic only because the vocabulary differs; every other pattern here is a literal. */
function keywordRule(keywords: string, caseInsensitive = false): Rule {
  return {
    type: 'keyword',
    pattern: new RegExp(`^\\b(?:${keywords})\\b`, caseInsensitive ? 'i' : ''),
  };
}

/** Trailer shared by every family: calls, bare identifiers, operators, whitespace. */
function tail(): Rule[] {
  return [
    { type: 'function', pattern: CALL },
    { type: 'plain', pattern: IDENTIFIER },
    { type: 'punctuation', pattern: OPERATOR },
    { type: 'plain', pattern: WHITESPACE },
  ];
}

/**
 * `//` and `/* *\/` comments, quoted strings, braces. Fourteen of the languages here differ only in
 * their keyword list, which is the whole reason this is a family rather than fourteen rule tables.
 * `annotation` covers the `@Override` / `#[derive]` decorations some of them carry.
 */
function braceFamily(keywords: string, annotation?: RegExp): Rule[] {
  const rules: Rule[] = [
    { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
    { type: 'comment', pattern: /^\/\/.*/ },
    { type: 'string', pattern: QUOTED },
    { type: 'number', pattern: NUMBER },
  ];
  if (annotation) rules.push({ type: 'attr-name', pattern: annotation });
  rules.push(keywordRule(keywords), ...tail());
  return rules;
}

/** `#` comments and no block comment. Python's triple quotes are handled before single ones. */
function hashFamily(keywords: string, tripleQuoted = false): Rule[] {
  const rules: Rule[] = [{ type: 'comment', pattern: /^#.*/ }];
  if (tripleQuoted) {
    rules.push({ type: 'string', pattern: /^("""[\s\S]*?"""|'''[\s\S]*?''')/ });
  }
  rules.push(
    { type: 'string', pattern: QUOTED },
    { type: 'number', pattern: NUMBER },
    { type: 'attr-name', pattern: /^@[\w.]+/ },
    keywordRule(keywords),
    ...tail()
  );
  return rules;
}

const MARKUP_RULES: Rule[] = [
  { type: 'comment', pattern: /^<!--[\s\S]*?-->/ },
  { type: 'comment', pattern: /^<!\[CDATA\[[\s\S]*?\]\]>/ },
  { type: 'tag', pattern: /^<\/?[a-zA-Z][\w.:-]*/ },
  { type: 'plain', pattern: WHITESPACE },
  { type: 'attr-name', pattern: /^[a-zA-Z_:][\w.:-]*(?=\s*=)/ },
  { type: 'attr-value', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'punctuation', pattern: /^(?:\/?>|=|<)/ },
  { type: 'plain', pattern: /^[^<]+/ },
];

/** Shared by css, scss and less; the nesting and variable syntaxes differ but the tokens don't. */
const STYLESHEET_RULES: Rule[] = [
  { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
  { type: 'comment', pattern: /^\/\/.*/ },
  { type: 'string', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'keyword', pattern: /^@[a-zA-Z-]+/ },
  { type: 'attr-name', pattern: /^[$@][\w-]+/ },
  { type: 'property', pattern: /^[a-zA-Z-]+(?=\s*:)/ },
  { type: 'number', pattern: /^#[0-9a-fA-F]{3,8}\b/ },
  { type: 'number', pattern: /^-?\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms|fr|ch|ex|pt)?\b/ },
  { type: 'function', pattern: CALL },
  { type: 'punctuation', pattern: /^[{}();:,>+~&]/ },
  { type: 'selector', pattern: /^[.#]?[a-zA-Z_-][\w-]*/ },
  { type: 'plain', pattern: WHITESPACE },
];

const JSON_RULES: Rule[] = [
  { type: 'attr-name', pattern: /^"(?:\\.|[^"])*"(?=\s*:)/ },
  { type: 'string', pattern: /^"(?:\\.|[^"])*"/ },
  { type: 'number', pattern: /^-?\d+\.?\d*(?:[eE][+-]?\d+)?/ },
  { type: 'keyword', pattern: /^\b(?:true|false|null)\b/ },
  { type: 'punctuation', pattern: /^[{}[\],:]/ },
  { type: 'plain', pattern: WHITESPACE },
];

const JSON5_RULES: Rule[] = [
  { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
  { type: 'comment', pattern: /^\/\/.*/ },
  { type: 'attr-name', pattern: /^(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[a-zA-Z_$][\w$]*)(?=\s*:)/ },
  { type: 'string', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'number', pattern: NUMBER },
  keywordRule(KEYWORDS.json5),
  { type: 'punctuation', pattern: /^[{}[\],:]/ },
  { type: 'plain', pattern: WHITESPACE },
];

/** `--` comments, and keywords matched case-insensitively because both styles are conventional. */
const SQL_RULES: Rule[] = [
  { type: 'comment', pattern: /^--.*/ },
  { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /^'(?:''|[^'])*'/ },
  { type: 'attr-name', pattern: /^"(?:""|[^"])*"/ },
  { type: 'number', pattern: /^-?\d+\.?\d*/ },
  keywordRule(KEYWORDS.sql, true),
  { type: 'function', pattern: CALL },
  { type: 'plain', pattern: IDENTIFIER },
  { type: 'punctuation', pattern: /^(?:<>|!=|>=|<=|\|\||[=<>+\-*/%.,;()[\]])/ },
  { type: 'plain', pattern: WHITESPACE },
];

const YAML_RULES: Rule[] = [
  { type: 'comment', pattern: /^#.*/ },
  { type: 'punctuation', pattern: /^(?:---|\.\.\.)/ },
  { type: 'attr-name', pattern: /^[\w.$-]+(?=\s*:)/ },
  { type: 'string', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'attr-value', pattern: /^[*&][\w-]+/ },
  { type: 'number', pattern: /^-?\d+\.?\d*\b/ },
  { type: 'keyword', pattern: /^\b(?:true|false|null|yes|no|on|off|~)\b/i },
  { type: 'punctuation', pattern: /^[:\-?[\]{},|>]/ },
  { type: 'plain', pattern: WHITESPACE },
  { type: 'plain', pattern: /^[^\s:#]+/ },
];

/** `[section]` headers and `key = value`; `#` and `;` both start a comment in practice. */
const INI_RULES: Rule[] = [
  { type: 'comment', pattern: /^[#;].*/ },
  { type: 'selector', pattern: /^\[[^\]\n]*\]/ },
  { type: 'attr-name', pattern: /^[\w.$-]+(?=\s*=)/ },
  { type: 'string', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'number', pattern: /^-?\d+\.?\d*\b/ },
  { type: 'keyword', pattern: /^\b(?:true|false)\b/i },
  { type: 'punctuation', pattern: /^=/ },
  { type: 'plain', pattern: WHITESPACE },
  { type: 'plain', pattern: /^[^\s=]+/ },
];

const MARKDOWN_RULES: Rule[] = [
  { type: 'comment', pattern: /^```[\s\S]*?```/ },
  { type: 'keyword', pattern: /^#{1,6} .*/ },
  { type: 'string', pattern: /^`[^`\n]*`/ },
  { type: 'attr-name', pattern: /^(?:\*\*|__)(?:(?!\*\*|__).)+(?:\*\*|__)/ },
  { type: 'attr-value', pattern: /^\[[^\]\n]*\]\([^)\n]*\)/ },
  { type: 'tag', pattern: /^^(?:[*+-]|\d+\.) /m },
  { type: 'punctuation', pattern: /^> ?/ },
  { type: 'selector', pattern: /^(?:---+|===+|\*\*\*+)\s*$/m },
  { type: 'plain', pattern: WHITESPACE },
  { type: 'plain', pattern: /^[^`*_[#>\s-]+/ },
];

/** Line-oriented: the leading character is the whole classification. */
const DIFF_RULES: Rule[] = [
  { type: 'comment', pattern: /^(?:diff --git|index |new file|deleted file|similarity).*/ },
  { type: 'keyword', pattern: /^@@[^\n]*@@/ },
  { type: 'string', pattern: /^\+(?!\+\+).*/ },
  { type: 'number', pattern: /^-(?!--).*/ },
  { type: 'attr-name', pattern: /^(?:\+\+\+|---).*/ },
  { type: 'plain', pattern: /^.+/ },
  { type: 'plain', pattern: WHITESPACE },
];

const LOG_RULES: Rule[] = [
  { type: 'number', pattern: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/ },
  { type: 'number', pattern: /^\d{2}:\d{2}:\d{2}(?:\.\d+)?/ },
  { type: 'keyword', pattern: /^\b(?:FATAL|ERROR|WARN(?:ING)?|INFO|DEBUG|TRACE|VERBOSE)\b/ },
  { type: 'string', pattern: QUOTED },
  { type: 'attr-name', pattern: /^[\w.]+(?==)/ },
  { type: 'number', pattern: /^\b\d+(?:\.\d+)?[a-z%]*\b/ },
  { type: 'selector', pattern: /^\[[^\]\n]*\]/ },
  { type: 'punctuation', pattern: /^[=:,;()[\]]/ },
  { type: 'plain', pattern: WHITESPACE },
  { type: 'plain', pattern: /^[^\s=:,;()[\]]+/ },
];

const ANNOTATION = /^@[\w.]+/;
const ATTRIBUTE = /^#\[[^\]\n]*\]/;

const LANGUAGE_RULES: Record<Language, Rule[]> = {
  javascript: braceFamily(KEYWORDS.javascript, ANNOTATION),
  typescript: braceFamily(KEYWORDS.typescript, ANNOTATION),
  tsx: braceFamily(KEYWORDS.typescript, ANNOTATION),
  java: braceFamily(KEYWORDS.java, ANNOTATION),
  kotlin: braceFamily(KEYWORDS.kotlin, ANNOTATION),
  swift: braceFamily(KEYWORDS.swift, ANNOTATION),
  go: braceFamily(KEYWORDS.go),
  rust: braceFamily(KEYWORDS.rust, ATTRIBUTE),
  c: braceFamily(KEYWORDS.c),
  cpp: braceFamily(KEYWORDS.cpp),
  csharp: braceFamily(KEYWORDS.csharp, ANNOTATION),
  php: braceFamily(KEYWORDS.php, ANNOTATION),
  dart: braceFamily(KEYWORDS.dart, ANNOTATION),
  scala: braceFamily(KEYWORDS.scala, ANNOTATION),
  protobuf: braceFamily(KEYWORDS.protobuf),

  python: hashFamily(KEYWORDS.python, true),
  ruby: hashFamily(KEYWORDS.ruby),
  bash: hashFamily(KEYWORDS.bash),
  dockerfile: hashFamily(KEYWORDS.dockerfile),
  makefile: hashFamily(KEYWORDS.makefile),
  graphql: hashFamily(KEYWORDS.graphql),

  yaml: YAML_RULES,
  toml: INI_RULES,
  ini: INI_RULES,
  properties: INI_RULES,
  json: JSON_RULES,
  json5: JSON5_RULES,

  html: MARKUP_RULES,
  xml: MARKUP_RULES,
  svg: MARKUP_RULES,
  markdown: MARKDOWN_RULES,

  css: STYLESHEET_RULES,
  scss: STYLESHEET_RULES,
  less: STYLESHEET_RULES,

  sql: SQL_RULES,
  diff: DIFF_RULES,
  log: LOG_RULES,

  plain: [],
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_RULES).sort() as Language[];

export function tokenize(code: string, language: Language): Token[] {
  const rules = LANGUAGE_RULES[language];
  if (rules.length === 0) return [{ type: 'plain', text: code }];

  const tokens: Token[] = [];
  let rest = code;
  while (rest.length > 0) {
    let matched = false;
    for (const rule of rules) {
      const match = rule.pattern.exec(rest);
      if (match && match[0].length > 0) {
        tokens.push({ type: rule.type, text: match[0] });
        rest = rest.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Nothing matched, so consume one character rather than spin. Runs of these coalesce, or a
    // body of unrecognised text would become one node per character.
    const last = tokens[tokens.length - 1];
    if (last?.type === 'plain') {
      last.text += rest[0];
    } else {
      tokens.push({ type: 'plain', text: rest[0] });
    }
    rest = rest.slice(1);
  }
  return tokens;
}

// ----------------------------------------------------------------- re-indenting

const INDENT_UNIT = '  ';

/**
 * Languages whose structure is braces and semicolons, so re-indenting on those is safe. Everything
 * else is excluded on purpose: python and yaml carry meaning in their existing indentation, markup
 * and markdown have their own shape, and the line-oriented formats are already one line per record.
 */
const FORMATTABLE = new Set<Language>([
  'javascript',
  'typescript',
  'tsx',
  'java',
  'kotlin',
  'swift',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'php',
  'dart',
  'scala',
  'protobuf',
  'graphql',
  'css',
  'scss',
  'less',
  'json',
  'json5',
  'sql',
]);

export function formatCode(code: string, language: Language): string {
  if (!FORMATTABLE.has(language)) return code;

  let output = '';
  let indent = 0;
  let atLineStart = true;
  let justInsertedSpace = false;

  for (const token of tokenize(code, language)) {
    const isWhitespaceOnly = token.type === 'plain' && /^\s+$/.test(token.text);
    if (isWhitespaceOnly) {
      if (!atLineStart && !justInsertedSpace) output += ' ';
      justInsertedSpace = false;
      continue;
    }

    if (token.type === 'punctuation' && (token.text === ',' || token.text === ':')) {
      output += `${token.text} `;
      atLineStart = false;
      justInsertedSpace = true;
      continue;
    }
    justInsertedSpace = false;

    if (token.type === 'punctuation' && (token.text === '{' || token.text === '[')) {
      output = atLineStart
        ? `${output}${token.text}`
        : `${output.replace(/[ \t]+$/, '')} ${token.text}`;
      indent += 1;
      output += `\n${INDENT_UNIT.repeat(indent)}`;
      atLineStart = true;
      continue;
    }

    if (token.type === 'punctuation' && (token.text === '}' || token.text === ']')) {
      indent = Math.max(0, indent - 1);
      output = atLineStart
        ? output.replace(/\n[ \t]*$/, `\n${INDENT_UNIT.repeat(indent)}`)
        : `${output.replace(/[ \t]+$/, '')}\n${INDENT_UNIT.repeat(indent)}`;
      output += `${token.text}\n${INDENT_UNIT.repeat(indent)}`;
      atLineStart = true;
      continue;
    }

    if (token.type === 'punctuation' && token.text === ';') {
      output += `;\n${INDENT_UNIT.repeat(indent)}`;
      atLineStart = true;
      continue;
    }

    output += token.text;
    atLineStart = false;
  }

  return output.trim();
}
