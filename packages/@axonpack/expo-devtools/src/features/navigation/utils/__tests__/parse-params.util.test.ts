import { parseParams } from '../parse-params.util';

describe('parseParams', () => {
  it('reads an empty field as no params', () => {
    expect(parseParams('  ')).toEqual({});
  });

  it('reads a JSON object', () => {
    expect(parseParams('{ "id": 42 }')).toEqual({ params: { id: 42 } });
  });

  it('refuses anything but an object', () => {
    expect(parseParams('[1]').error).toBe('Params must be a JSON object.');
    expect(parseParams('null').error).toBe('Params must be a JSON object.');
    expect(parseParams('{ id').error).toBe('Params are not valid JSON.');
  });
});
