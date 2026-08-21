import { parseXml, type XmlElement } from '../parse-xml.util';

function root(source: string): XmlElement {
  const result = parseXml(source);
  if ('error' in result) throw new Error(`expected a tree, got: ${result.error}`);
  return result.root;
}

function error(source: string): string {
  const result = parseXml(source);
  if (!('error' in result)) throw new Error('expected an error');
  return result.error;
}

describe('parseXml', () => {
  it('reads an element and its text', () => {
    expect(root('<name>Ada</name>')).toMatchObject({
      name: 'name',
      children: [{ kind: 'text', value: 'Ada' }],
    });
  });

  it('reads attributes in either kind of quote', () => {
    expect(root(`<a href="/x" title='y'/>`).attributes).toEqual([
      { name: 'href', value: '/x' },
      { name: 'title', value: 'y' },
    ]);
  });

  it('nests children', () => {
    const tree = root('<feed><entry><id>1</id></entry></feed>');

    expect(tree.name).toBe('feed');
    expect((tree.children[0] as XmlElement).name).toBe('entry');
    expect(((tree.children[0] as XmlElement).children[0] as XmlElement).name).toBe('id');
  });

  // A ten-element document would otherwise come back as twenty-one nodes, most of them newlines.
  it('drops the whitespace a document was indented with', () => {
    const tree = root('<feed>\n  <entry />\n  <entry />\n</feed>');

    expect(tree.children).toHaveLength(2);
  });

  // The other half of that rule: text with anything in it is content, even beside an element.
  it('keeps mixed content', () => {
    const tree = root('<p>Hello <b>world</b>!</p>');

    expect(tree.children.map((child) => child.kind)).toEqual(['text', 'element', 'text']);
  });

  it('decodes the entities XML names, and numeric ones', () => {
    expect(root('<t>&lt;a&gt; &amp; &quot;b&quot; &#65;&#x42;</t>').children[0]).toEqual({
      kind: 'text',
      value: '<a> & "b" AB',
    });
  });

  it('leaves an entity it does not know as it was written', () => {
    expect(root('<t>&nbsp;x</t>').children[0]).toMatchObject({ value: '&nbsp;x' });
  });

  // The whole point of CDATA is that what is inside it is not markup.
  it('keeps a CDATA block verbatim', () => {
    const tree = root('<t><![CDATA[<b>&amp; not markup</b>]]></t>');

    expect(tree.children[0]).toEqual({ kind: 'cdata', value: '<b>&amp; not markup</b>' });
  });

  it('ignores the prologue, comments and a doctype', () => {
    const tree = root('<?xml version="1.0"?><!-- note --><!DOCTYPE t><t>x</t>');

    expect(tree.name).toBe('t');
    expect(tree.children).toHaveLength(1);
  });

  it('treats a self-closing element as one with no children', () => {
    expect(root('<t><br/></t>').children[0]).toMatchObject({ name: 'br', children: [] });
  });

  it('reads a namespaced name whole', () => {
    expect(root('<soap:Body><x/></soap:Body>').name).toBe('soap:Body');
  });

  // Reading a response is not certifying it, so a broken document explains itself instead of throwing.
  it.each([
    ['<a><b></a>', 'does not match'],
    ['<a>', 'never closed'],
    ['<a/><b/>', 'one root element'],
    ['nothing here', 'No elements'],
    ['<t><![CDATA[oops</t>', 'CDATA'],
  ])('explains what is wrong with %p', (source, expected) => {
    expect(error(source)).toContain(expected);
  });
});
