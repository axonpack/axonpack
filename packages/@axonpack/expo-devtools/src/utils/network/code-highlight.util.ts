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

export type Language = 'javascript' | 'css' | 'markup' | 'plain';

export const MAX_HIGHLIGHT_LENGTH = 50_000;

function detectFromContent(body: string): Language {
  const trimmed = body.trimStart();
  if (/^(<!doctype|<html|<\?xml)/i.test(trimmed)) return 'markup';

  if (/^[.#@a-zA-Z][^{}]{0,80}\{[^}]*:[^}]*\}/.test(trimmed)) return 'css';
  return 'plain';
}

export function detectLanguage(mimeType: string | undefined, body: string): Language {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.includes('javascript') || mime.includes('ecmascript') || mime.includes('typescript')) {
    return 'javascript';
  }
  if (mime.includes('css')) return 'css';
  if (mime.includes('html') || mime.includes('xml') || mime.includes('svg')) return 'markup';
  return detectFromContent(body);
}

const JS_KEYWORDS =
  '(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|' +
  'extends|super|this|import|export|default|from|as|async|await|try|catch|finally|throw|typeof|' +
  'instanceof|in|of|null|undefined|true|false|void|yield|static|get|set)';

const JAVASCRIPT_RULES: Rule[] = [
  { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
  { type: 'comment', pattern: /^\/\/.*/ },
  { type: 'string', pattern: /^(['"`])(?:\\.|(?!\1).)*\1/ },
  { type: 'number', pattern: /^\b0x[\da-fA-F]+\b|^\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/ },
  { type: 'keyword', pattern: new RegExp(`^\\b${JS_KEYWORDS}\\b`) },
  { type: 'function', pattern: /^[a-zA-Z_$][\w$]*(?=\s*\()/ },
  { type: 'plain', pattern: /^[a-zA-Z_$][\w$]*/ },
  {
    type: 'punctuation',
    pattern: /^(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\?\.|[+\-*/%=<>!&|^~?:.,;()[\]{}])/,
  },
  { type: 'plain', pattern: /^\s+/ },
];

const CSS_RULES: Rule[] = [
  { type: 'comment', pattern: /^\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'keyword', pattern: /^@[a-zA-Z-]+/ },
  { type: 'property', pattern: /^[a-zA-Z-]+(?=\s*:)/ },
  { type: 'number', pattern: /^#[0-9a-fA-F]{3,8}\b/ },
  { type: 'number', pattern: /^-?\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?\b/ },
  { type: 'punctuation', pattern: /^[{}();:,]/ },
  { type: 'selector', pattern: /^[.#]?[a-zA-Z_-][\w-]*/ },
  { type: 'plain', pattern: /^\s+/ },
];

const MARKUP_RULES: Rule[] = [
  { type: 'comment', pattern: /^<!--[\s\S]*?-->/ },
  { type: 'tag', pattern: /^<\/?[a-zA-Z][\w-]*/ },

  { type: 'plain', pattern: /^\s+/ },
  { type: 'attr-name', pattern: /^[a-zA-Z-]+(?=\s*=)/ },
  { type: 'attr-value', pattern: /^(['"])(?:\\.|(?!\1).)*\1/ },
  { type: 'punctuation', pattern: /^=/ },
  { type: 'punctuation', pattern: /^\/?>/ },
  { type: 'plain', pattern: /^[^<]+/ },
];

const LANGUAGE_RULES: Record<Language, Rule[]> = {
  javascript: JAVASCRIPT_RULES,
  css: CSS_RULES,
  markup: MARKUP_RULES,
  plain: [],
};

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

const INDENT_UNIT = '  ';

export function formatCode(code: string, language: Language): string {
  if (language !== 'javascript' && language !== 'css') return code;

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

    if (token.type === 'punctuation' && token.text === '{') {
      output = atLineStart ? `${output}{` : `${output.replace(/[ \t]+$/, '')} {`;
      indent += 1;
      output += `\n${INDENT_UNIT.repeat(indent)}`;
      atLineStart = true;
      continue;
    }

    if (token.type === 'punctuation' && token.text === '}') {
      indent = Math.max(0, indent - 1);
      output = atLineStart
        ? output.replace(/\n[ \t]*$/, `\n${INDENT_UNIT.repeat(indent)}`)
        : `${output.replace(/[ \t]+$/, '')}\n${INDENT_UNIT.repeat(indent)}`;
      output += `}\n${INDENT_UNIT.repeat(indent)}`;
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
