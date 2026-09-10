import { expect, test } from 'bun:test';

import { parseXml, type XmlElement } from './parse-xml.util';

function root(source: string): XmlElement {
  const parsed = parseXml(source);
  if ('error' in parsed) throw new Error(`expected a tree, got: ${parsed.error}`);
  return parsed.root;
}

test('parses elements, attributes and nesting', () => {
  const feed = root('<feed count="2"><item id="a">One</item><item id="b"/></feed>');

  expect(feed.name).toBe('feed');
  expect(feed.attributes).toEqual([{ name: 'count', value: '2' }]);
  expect(feed.children).toHaveLength(2);
  expect((feed.children[0] as XmlElement).children[0]).toEqual({ kind: 'text', value: 'One' });
  // Self-closing elements are elements, just childless.
  expect((feed.children[1] as XmlElement).children).toEqual([]);
});

test('drops indentation between siblings but keeps mixed content', () => {
  expect(root('<a>\n  <b/>\n  <c/>\n</a>').children).toHaveLength(2);
  expect(root('<p>Hello <b>world</b>!</p>').children.map((c) => c.kind)).toEqual([
    'text',
    'element',
    'text',
  ]);
});

test('decodes entities everywhere except inside CDATA', () => {
  expect(root('<a t="1 &lt; 2">3 &gt; 2 &#65;</a>')).toMatchObject({
    attributes: [{ name: 't', value: '1 < 2' }],
    children: [{ kind: 'text', value: '3 > 2 A' }],
  });
  // The whole point of CDATA is that what is inside it is not markup.
  expect(root('<a><![CDATA[<b>&amp;</b>]]></a>').children[0]).toEqual({
    kind: 'cdata',
    value: '<b>&amp;</b>',
  });
});

test('strips the prologue, doctype and comments', () => {
  expect(root('<?xml version="1.0"?><!-- hi --><a/>').name).toBe('a');
});

test('a broken document explains itself instead of throwing', () => {
  expect(parseXml('<a><b></a>')).toEqual({
    error: 'Closing tag </a> does not match <b>.',
  });
  expect(parseXml('<a>')).toEqual({ error: '<a> was never closed.' });
  expect(parseXml('<a/><b/>')).toEqual({ error: 'A document can only have one root element.' });
  expect(parseXml('plain text')).toEqual({ error: 'No elements found.' });
  expect(parseXml('<a><![CDATA[oops</a>')).toEqual({ error: 'A CDATA block was never closed.' });
});
