import { formatActionPreview, parseTypedAction } from '../format-redux.util';

describe('parseTypedAction', () => {
  it('accepts an object with a string type', () => {
    expect(parseTypedAction('{"type":"a","payload":1}')).toEqual({
      action: { type: 'a', payload: 1 },
    });
  });

  it('says what is wrong otherwise', () => {
    expect(parseTypedAction('')).toEqual({});
    expect(parseTypedAction('{').error).toMatch(/not valid JSON/);
    expect(parseTypedAction('[]').error).toMatch(/JSON object/);
    expect(parseTypedAction('{"payload":1}').error).toMatch(/string "type"/);
  });
});

describe('formatActionPreview', () => {
  it('drops the type and is null when nothing else is there', () => {
    expect(formatActionPreview({ type: 'a' })).toBeNull();
    expect(formatActionPreview({ type: 'a', payload: undefined })).toBeNull();
    expect(formatActionPreview({ type: 'a', payload: 1 })).toBe('{"payload":1}');
  });
});
