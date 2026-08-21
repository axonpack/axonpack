import { describeRequestBody } from '../request-body.util';

/** React Native's own shape: no `entries()`, parts in a private array. */
function reactNativeFormData(parts: [string, unknown][]): FormData {
  return { _parts: parts } as unknown as FormData;
}

describe('describeRequestBody', () => {
  it('passes a string body through, and measures it', () => {
    // The size is what an upload's time on a throttled connection is billed against.
    expect(describeRequestBody('{"a":1}')).toEqual({ preview: '{"a":1}', byteSize: 7 });
  });

  it('measures a body in bytes rather than characters', () => {
    expect(describeRequestBody('héllo').byteSize).toBe(6);
  });

  it('has nothing to say about no body', () => {
    expect(describeRequestBody(undefined)).toEqual({});
    expect(describeRequestBody(null)).toEqual({});
  });

  it('reads a binary body as its length rather than a placeholder', () => {
    expect(describeRequestBody(new ArrayBuffer(24)).preview).toBe('[binary body, 24 bytes]');
    expect(describeRequestBody(new Uint8Array(8)).preview).toBe('[binary body, 8 bytes]');
    expect(describeRequestBody(new ArrayBuffer(24)).byteSize).toBe(24);
  });
});

describe('describeRequestBody with form data', () => {
  // Not `instanceof FormData` under this runtime unless the global exists, so the suite provides one.
  const OriginalFormData = globalThis.FormData;

  beforeAll(() => {
    class FakeFormData {}
    // @ts-expect-error standing in for the platform's own class
    globalThis.FormData = FakeFormData;
  });

  afterAll(() => {
    globalThis.FormData = OriginalFormData;
  });

  function make(parts: [string, unknown][]) {
    const body = Object.create(globalThis.FormData.prototype) as FormData;
    Object.assign(body, reactNativeFormData(parts));
    return body;
  }

  it('reads text fields out of the private parts array', () => {
    expect(describeRequestBody(make([['title', 'hello']])).fields).toEqual([
      { name: 'title', kind: 'text', value: 'hello' },
    ]);
  });

  it('reads a file part written as React Native passes a picked file', () => {
    const parts: [string, unknown][] = [
      ['photo', { uri: 'file:///tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
    ];

    expect(describeRequestBody(make(parts)).fields).toEqual([
      {
        name: 'photo',
        kind: 'file',
        fileName: 'a.jpg',
        contentType: 'image/jpeg',
        size: undefined,
      },
    ]);
  });

  // A Blob keeps its name one level down, on the data object it wraps.
  it('reads a file part whose name is on the wrapped data', () => {
    const parts: [string, unknown][] = [
      ['doc', { data: { name: 'b.pdf', type: 'application/pdf', size: 120 } }],
    ];

    expect(describeRequestBody(make(parts)).fields).toEqual([
      { name: 'doc', kind: 'file', fileName: 'b.pdf', contentType: 'application/pdf', size: 120 },
    ]);
  });

  it('summarises the parts for the row and the search', () => {
    const parts: [string, unknown][] = [
      ['title', 'hello'],
      ['photo', { name: 'a.jpg' }],
    ];

    expect(describeRequestBody(make(parts)).preview).toBe('title=hello&photo=@a.jpg');
  });
});
