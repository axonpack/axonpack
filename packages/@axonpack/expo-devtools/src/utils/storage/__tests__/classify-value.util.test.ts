import { classifyStoredValue, isTreeValue, parseStoredJson } from '../classify-value.util';

describe('classifyStoredValue', () => {
  it('recognises JSON containers', () => {
    expect(classifyStoredValue('{"a":1}', 'string')).toBe('json-object');
    expect(classifyStoredValue('  [1,2]  ', 'string')).toBe('json-array');
  });

  it('leaves text that only looks like JSON as a string', () => {
    expect(classifyStoredValue('{not json', 'string')).toBe('string');
    expect(classifyStoredValue('hello', 'string')).toBe('string');
  });

  it('keeps a JSON primitive as a string rather than pretending it is a number', () => {
    expect(classifyStoredValue('42', 'string')).toBe('string');
    expect(classifyStoredValue('true', 'string')).toBe('string');
  });

  it('trusts the driver over the text for a typed value', () => {
    expect(classifyStoredValue('42', 'number')).toBe('number');
    expect(classifyStoredValue('false', 'boolean')).toBe('boolean');
    expect(classifyStoredValue('3 bytes', 'buffer')).toBe('buffer');
  });

  it('separates a missing key from an empty value', () => {
    expect(classifyStoredValue(null, 'string')).toBe('absent');
    expect(classifyStoredValue('', 'string')).toBe('empty');
  });
});

describe('parseStoredJson', () => {
  it('returns null for anything unparseable', () => {
    expect(parseStoredJson('{oops')).toBeNull();
  });

  it('parses a container', () => {
    expect(parseStoredJson('{"a":[1]}')).toEqual({ a: [1] });
  });
});

describe('isTreeValue', () => {
  it('is true only for something with children to expand', () => {
    expect(isTreeValue({ a: 1 })).toBe(true);
    expect(isTreeValue([1])).toBe(true);
    expect(isTreeValue('a')).toBe(false);
    expect(isTreeValue(null)).toBe(false);
  });
});
