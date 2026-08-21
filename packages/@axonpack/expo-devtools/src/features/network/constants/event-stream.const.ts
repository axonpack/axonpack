/**
 * What a response has to declare for its body to be read as a stream of events. Recognising the type
 * rather than any one client library is what makes stream capture library-agnostic: `react-native-sse`
 * and every other SSE client is built on `XMLHttpRequest` or `fetch`, both of which are already
 * patched here.
 */
export const EVENT_STREAM_MIME_TYPE = 'text/event-stream';
