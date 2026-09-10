import { formatJson } from '../format-json.util';

describe('formatJson', () => {
  it('indents an object or array', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatJson('  [1,2]  ')).toBe('[\n  1,\n  2\n]');
  });

  it('leaves anything that is not JSON exactly as it arrived', () => {
    expect(formatJson('{ not json ')).toBe('{ not json ');
    expect(formatJson('<html></html>')).toBe('<html></html>');
    expect(formatJson('')).toBe('');
  });

  it('leaves a bare scalar alone rather than rewriting it', () => {
    expect(formatJson('123')).toBe('123');
    expect(formatJson('"ok"')).toBe('"ok"');
  });
});
