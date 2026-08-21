/**
 * XML into a tree, without a parser.
 *
 * React Native has no `DOMParser` and no DOM, so a browser panel's approach — hand `documentElement`
 * to a renderer — is not available here. This is the smallest parser that answers what a response
 * viewer asks: what are the elements, what are their attributes, and what text is inside them.
 *
 * It is deliberately not a validator. A response is read to be understood, not to be certified, so a
 * document that does not parse returns an error for the caller to show the raw body against rather
 * than a thrown exception.
 */
export type XmlElement = {
  kind: 'element';
  name: string;
  attributes: { name: string; value: string }[];
  children: XmlNode[];
};

export type XmlText = { kind: 'text'; value: string };

/** Kept apart from text, because a CDATA block is the one place markup is deliberately not markup. */
export type XmlCData = { kind: 'cdata'; value: string };

export type XmlNode = XmlElement | XmlText | XmlCData;

export type XmlParseResult = { root: XmlElement } | { error: string };

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/** The five XML has by name, plus numeric ones. An unknown entity is left as written. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

const NAME = '[A-Za-z_:][\\w.:-]*';
const ATTRIBUTE = new RegExp(`(${NAME})\\s*=\\s*("[^"]*"|'[^']*')`, 'g');

function parseAttributes(raw: string): { name: string; value: string }[] {
  const attributes: { name: string; value: string }[] = [];
  for (const match of raw.matchAll(ATTRIBUTE)) {
    attributes.push({ name: match[1], value: decodeEntities(match[2].slice(1, -1)) });
  }
  return attributes;
}

/**
 * Whitespace between sibling elements is how a document was indented, not content — a ten-element
 * document would otherwise render as twenty-one nodes. Text with anything else in it survives, so
 * mixed content like `<p>Hello <b>world</b>!</p>` keeps its fragments.
 */
function isIndentation(value: string): boolean {
  return value.trim() === '';
}

export function parseXml(source: string): XmlParseResult {
  // The prologue, comments and doctype are dropped rather than represented: they are rare in a
  // response and never what someone opened the tab to read. The raw body still has them.
  const text = source
    .replace(/^﻿/, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?[^>]*>/gi, '');

  const stack: XmlElement[] = [];
  let root: XmlElement | undefined;
  let index = 0;

  while (index < text.length) {
    const open = text.indexOf('<', index);

    if (open < 0) break;

    if (open > index) {
      const value = decodeEntities(text.slice(index, open));
      if (!isIndentation(value)) {
        const parent = stack[stack.length - 1];
        if (parent) parent.children.push({ kind: 'text', value: value.trim() });
      }
    }

    if (text.startsWith('<![CDATA[', open)) {
      const end = text.indexOf(']]>', open);
      if (end < 0) return { error: 'A CDATA block was never closed.' };
      const parent = stack[stack.length - 1];
      // Never decoded: the whole point of CDATA is that what is inside it is not markup.
      if (parent) parent.children.push({ kind: 'cdata', value: text.slice(open + 9, end) });
      index = end + 3;
      continue;
    }

    const close = text.indexOf('>', open);
    if (close < 0) return { error: 'A tag was never closed.' };
    const inner = text.slice(open + 1, close);

    if (inner.startsWith('/')) {
      const name = inner.slice(1).trim();
      const current = stack[stack.length - 1];
      if (!current) return { error: `Closing tag </${name}> matches no open element.` };
      if (current.name !== name) {
        return { error: `Closing tag </${name}> does not match <${current.name}>.` };
      }
      stack.pop();
      index = close + 1;
      continue;
    }

    const selfClosing = inner.endsWith('/');
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const nameMatch = body.match(new RegExp(`^${NAME}`));
    if (!nameMatch) return { error: 'A tag has no name.' };

    const element: XmlElement = {
      kind: 'element',
      name: nameMatch[0],
      attributes: parseAttributes(body.slice(nameMatch[0].length)),
      children: [],
    };

    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(element);
    else if (root) return { error: 'A document can only have one root element.' };
    else root = element;

    if (!selfClosing) stack.push(element);
    index = close + 1;
  }

  if (stack.length > 0) return { error: `<${stack[stack.length - 1].name}> was never closed.` };
  if (!root) return { error: 'No elements found.' };
  return { root };
}
