import { namespaceOf, previewLine, UNGROUPED_NAMESPACE, utf8ByteLength } from '../formatters.util';

describe('previewLine', () => {
  it('collapses a pretty-printed value onto one line', () => {
    expect(previewLine('{\n  "a": 1\n}')).toBe('{ "a": 1 }');
  });

  it('says which of missing and empty it is looking at', () => {
    expect(previewLine(null)).toBe('—');
    expect(previewLine('')).toBe('(empty)');
  });

  it('clamps a long value', () => {
    const preview = previewLine('x'.repeat(500));
    expect(preview).toHaveLength(121);
    expect(preview.endsWith('…')).toBe(true);
  });
});

describe('utf8ByteLength', () => {
  it('counts bytes, not code units', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('☃')).toBe(3);
    // Two code units, four bytes.
    expect(utf8ByteLength('🚀')).toBe(4);
  });

  it('is zero for a missing value', () => {
    expect(utf8ByteLength(null)).toBe(0);
  });
});

describe('namespaceOf', () => {
  it('splits on the first delimiter in priority order, not by position', () => {
    expect(namespaceOf('auth:cache.v1')).toBe('auth');
    expect(namespaceOf('cache/user/1')).toBe('cache');
    expect(namespaceOf('feature.flag')).toBe('feature');
    expect(namespaceOf('user_name')).toBe('user');
  });

  it('leaves a key with no prefix ungrouped', () => {
    expect(namespaceOf('token')).toBe(UNGROUPED_NAMESPACE);
    expect(namespaceOf(':leading')).toBe(UNGROUPED_NAMESPACE);
  });
});
