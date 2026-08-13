import { encodeBase64 } from '../export-network-log.util';

describe('encodeBase64', () => {
  it('matches the RFC 4648 test vectors, padding included', () => {
    expect(encodeBase64('')).toBe('');
    expect(encodeBase64('f')).toBe('Zg==');
    expect(encodeBase64('fo')).toBe('Zm8=');
    expect(encodeBase64('foo')).toBe('Zm9v');
    expect(encodeBase64('foob')).toBe('Zm9vYg==');
    expect(encodeBase64('fooba')).toBe('Zm9vYmE=');
    expect(encodeBase64('foobar')).toBe('Zm9vYmFy');
  });

  it('encodes the UTF-8 bytes, not the code units', () => {
    expect(encodeBase64('é')).toBe('w6k=');
    expect(encodeBase64('☃')).toBe('4piD');
    expect(encodeBase64('𝄞')).toBe('8J2Eng==');
  });

  it('round-trips a response body through Node to prove the bytes are right', () => {
    const body = JSON.stringify({ name: 'café', emoji: '🚀', nested: [1, 2, 3] });
    expect(Buffer.from(encodeBase64(body), 'base64').toString('utf8')).toBe(body);
  });
});
