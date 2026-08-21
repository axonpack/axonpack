import { createEventStreamParser } from '../parse-event-stream.util';

describe('createEventStreamParser', () => {
  it('dispatches a plain data block as a message', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data: hello\n\n')).toEqual([{ type: 'message', data: 'hello' }]);
  });

  it('takes the event type the block named', () => {
    const parser = createEventStreamParser();

    expect(parser.push('event: token\ndata: hi\n\n')).toEqual([{ type: 'token', data: 'hi' }]);
  });

  it('joins multiple data lines with a newline, and drops the trailing one', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data: one\ndata: two\n\n')).toEqual([
      { type: 'message', data: 'one\ntwo' },
    ]);
  });

  // The half a block that arrived is the normal case, not the edge case: chunks land wherever the
  // network cut them.
  it('holds a block that is only half here until the rest arrives', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data: par')).toEqual([]);
    expect(parser.push('tial\n')).toEqual([]);
    expect(parser.push('\n')).toEqual([{ type: 'message', data: 'partial' }]);
  });

  it('waits before deciding a trailing CR was not half a CRLF', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data: a\r')).toEqual([]);
    expect(parser.push('\ndata: b\r\n\r\n')).toEqual([{ type: 'message', data: 'a\nb' }]);
  });

  it('ignores a comment, which is what a keep-alive ping is', () => {
    const parser = createEventStreamParser();

    expect(parser.push(': ping\n\n')).toEqual([]);
  });

  it('carries the last id forward until the server sends another', () => {
    const parser = createEventStreamParser();

    expect(parser.push('id: 1\ndata: first\n\n')).toEqual([
      { type: 'message', data: 'first', lastEventId: '1' },
    ]);
    expect(parser.push('data: second\n\n')).toEqual([
      { type: 'message', data: 'second', lastEventId: '1' },
    ]);
  });

  it('resets the event type after a dispatch, the way EventSource does', () => {
    const parser = createEventStreamParser();
    parser.push('event: done\ndata: a\n\n');

    expect(parser.push('data: b\n\n')).toEqual([{ type: 'message', data: 'b' }]);
  });

  it('reports nothing for a block that carried no data', () => {
    const parser = createEventStreamParser();

    expect(parser.push('id: 7\nretry: 3000\n\n')).toEqual([]);
  });

  it('keeps a value that has colons of its own intact', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data: {"url":"https://example.test"}\n\n')).toEqual([
      { type: 'message', data: '{"url":"https://example.test"}' },
    ]);
  });

  it('strips one leading space after the colon and no more', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data:  indented\n\n')).toEqual([{ type: 'message', data: ' indented' }]);
  });

  it('reads a field written with no value at all', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data\n\n')).toEqual([{ type: 'message', data: '' }]);
  });

  it('drops a byte-order mark rather than reading it as part of the first field', () => {
    const parser = createEventStreamParser();

    expect(parser.push('\uFEFFdata: hello\n\n')).toEqual([{ type: 'message', data: 'hello' }]);
  });

  it('returns every block a single chunk happened to contain', () => {
    const parser = createEventStreamParser();

    expect(parser.push('data: a\n\ndata: b\n\ndata: c\n\n')).toHaveLength(3);
  });
});
