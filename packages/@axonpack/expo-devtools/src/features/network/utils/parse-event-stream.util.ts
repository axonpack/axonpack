/**
 * The `text/event-stream` wire format, parsed as it arrives rather than from a finished body — a
 * stream's whole point is that it has no end, so a parser that waited for one would never run.
 *
 * Written to the HTML spec's own field rules (`event`, `data`, `id`, `retry`, `:` comments, LF / CR /
 * CRLF terminators, one optional space after the colon) rather than to the tidy subset most servers
 * happen to send, because what shows up here is whatever the app's client library wrote.
 */

export type ParsedServerSentEvent = {
  /** `message` unless the block named one — the type `EventSource` would have dispatched. */
  type: string;
  data: string;
  /** The `id:` in force, which persists across blocks until the server sends another. */
  lastEventId?: string;
};

export type EventStreamParser = {
  /** Parses everything complete in `chunk` and keeps any partial line for the next call. */
  push(chunk: string): ParsedServerSentEvent[];
};

export function createEventStreamParser(): EventStreamParser {
  let buffer = '';
  let atStart = true;
  let dataLines: string[] = [];
  let eventType = '';
  let lastEventId: string | undefined;

  function dispatch(events: ParsedServerSentEvent[]) {
    // A block with no `data:` is not an event: a comment keep-alive or a bare `id:` moves the stream
    // along without one, and turning that into an empty message would invent traffic.
    if (dataLines.length > 0) {
      events.push({
        type: eventType || 'message',
        // Joining the lines is also how the spec's trailing newline gets dropped.
        data: dataLines.join('\n'),
        ...(lastEventId === undefined ? null : { lastEventId }),
      });
      dataLines = [];
    }
    eventType = '';
  }

  function handleLine(line: string, events: ParsedServerSentEvent[]) {
    if (line === '') {
      dispatch(events);
      return;
    }
    if (line.startsWith(':')) return;

    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const raw = colon < 0 ? '' : line.slice(colon + 1);
    const value = raw.startsWith(' ') ? raw.slice(1) : raw;

    if (field === 'data') dataLines.push(value);
    else if (field === 'event') eventType = value;
    // A NUL in an id is the one value the spec says to throw away rather than honour.
    else if (field === 'id' && !value.includes('\0')) lastEventId = value;
    // `retry` is read and dropped on purpose: it is the reconnection delay, which belongs to the
    // connection rather than to any one event. Naming it here is what stops it being read as data.
  }

  return {
    push(chunk: string) {
      if (atStart) {
        atStart = false;
        if (chunk.startsWith('\uFEFF')) chunk = chunk.slice(1);
      }
      buffer += chunk;

      const events: ParsedServerSentEvent[] = [];
      let lineStart = 0;
      let index = 0;

      while (index < buffer.length) {
        const char = buffer[index];
        if (char !== '\n' && char !== '\r') {
          index += 1;
          continue;
        }
        // A CR at the very end of what has arrived may be the first half of a CRLF, so the line is
        // left unterminated until the next chunk says which it was.
        if (char === '\r' && index === buffer.length - 1) break;

        handleLine(buffer.slice(lineStart, index), events);
        index += char === '\r' && buffer[index + 1] === '\n' ? 2 : 1;
        lineStart = index;
      }

      buffer = buffer.slice(lineStart);
      return events;
    },
  };
}
