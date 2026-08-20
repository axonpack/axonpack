import { classifyPreview } from '../preview-kind.util';

describe('classifyPreview', () => {
  it('sends a bitmap to the image view', () => {
    expect(classifyPreview('image/png')).toBe('image');
    expect(classifyPreview('image/jpeg')).toBe('image');
  });

  // The regression this ordering exists for: `image/svg+xml` matches `image/` first, and the image
  // view renders nothing for it.
  it('sends an SVG to the WebView despite its image content type', () => {
    expect(classifyPreview('image/svg+xml')).toBe('webview');
    expect(classifyPreview('IMAGE/SVG+XML')).toBe('webview');
    expect(classifyPreview('application/svg+xml')).toBe('webview');
  });

  it('sends HTML to the WebView', () => {
    expect(classifyPreview('text/html; charset=utf-8')).toBe('webview');
  });

  it('falls back to text for everything else, including a missing type', () => {
    expect(classifyPreview('application/json')).toBe('text');
    expect(classifyPreview('')).toBe('text');
    expect(classifyPreview(undefined)).toBe('text');
  });
});
