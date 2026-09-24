import { CODE_SNIPPET_TARGETS, type SnippetSource } from '../code-snippets.util';

const build = (id: string, source: SnippetSource) =>
  (CODE_SNIPPET_TARGETS.find((target) => target.id === id) ?? CODE_SNIPPET_TARGETS[0]).build(
    source
  );

/** Everything that breaks a string somewhere: a quote, a dollar, a backslash and a control byte. */
const awkward = `it's "$HOME" \\ \u0001`;

const source: SnippetSource = {
  method: 'POST',
  url: 'https://example.dev/api?q=1',
  requestHeaders: { 'Content-Type': 'application/json', 'X-Note': awkward },
  requestBody: '{"a":1}',
};

describe('code snippets', () => {
  it('escapes a dollar for Kotlin, where it would start a template', () => {
    expect(build('kotlin', source)).toContain('\\"\\$HOME\\"');
  });

  it("writes a Unicode escape Swift's way", () => {
    const swift = build('swift', source);
    expect(swift).toContain('\\u{0001}');
    expect(swift).not.toContain('\\u0001');
  });

  it('closes and reopens a single quote for the shell', () => {
    expect(build('httpie', source)).toContain(`'X-Note:it'\\''s`);
  });

  it('leaves the body off a request whose method sends none', () => {
    for (const target of CODE_SNIPPET_TARGETS.filter(({ id }) =>
      ['python', 'axios', 'swift', 'kotlin', 'go', 'httpie'].includes(id)
    )) {
      expect(target.build({ ...source, method: 'GET' })).not.toContain('{\\"a\\":1}');
    }
  });

  it('offers every language once', () => {
    const ids = CODE_SNIPPET_TARGETS.map((target) => target.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
