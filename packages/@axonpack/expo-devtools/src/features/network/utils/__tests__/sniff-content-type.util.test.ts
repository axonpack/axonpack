import {
  isTextLikeContentType,
  sniffContentTypeFromBytes,
  sniffContentTypeFromText,
} from '../sniff-content-type.util';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('sniffContentTypeFromBytes', () => {
  it('recognises the formats a mobile app actually receives', () => {
    expect(sniffContentTypeFromBytes(bytes(0x89, 0x50, 0x4e, 0x47))).toBe('image/png');
    expect(sniffContentTypeFromBytes(bytes(0xff, 0xd8, 0xff))).toBe('image/jpeg');
    expect(sniffContentTypeFromBytes(bytes(0x47, 0x49, 0x46, 0x38))).toBe('image/gif');
    expect(sniffContentTypeFromBytes(bytes(0x25, 0x50, 0x44, 0x46))).toBe('application/pdf');
  });

  it('says nothing rather than guessing', () => {
    expect(sniffContentTypeFromBytes(bytes(0x01, 0x02, 0x03, 0x04))).toBeUndefined();
    expect(sniffContentTypeFromBytes(bytes())).toBeUndefined();
  });
});

describe('sniffContentTypeFromText', () => {
  it('reads the shape of a text body', () => {
    expect(sniffContentTypeFromText('  {"a":1}')).toBe('application/json');
    expect(sniffContentTypeFromText('[1,2]')).toBe('application/json');
    expect(sniffContentTypeFromText('<?xml version="1.0"?><a/>')).toBe('application/xml');
    expect(sniffContentTypeFromText('<!DOCTYPE html><html>')).toBe('text/html');
    expect(sniffContentTypeFromText('<svg viewBox="0 0 1 1">')).toBe('image/svg+xml');
  });

  it('says nothing for prose or an empty body', () => {
    expect(sniffContentTypeFromText('hello there')).toBeUndefined();
    expect(sniffContentTypeFromText('   ')).toBeUndefined();
  });
});

describe('isTextLikeContentType', () => {
  it('treats an undeclared type as text, since that is what most bodies are', () => {
    expect(isTextLikeContentType(undefined)).toBe(true);
  });

  it('sorts the declared ones', () => {
    expect(isTextLikeContentType('application/json; charset=utf-8')).toBe(true);
    expect(isTextLikeContentType('image/svg+xml')).toBe(true);
    expect(isTextLikeContentType('image/png')).toBe(false);
    expect(isTextLikeContentType('application/octet-stream')).toBe(false);
  });
});
