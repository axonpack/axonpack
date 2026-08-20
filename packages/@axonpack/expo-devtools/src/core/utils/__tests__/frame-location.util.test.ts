import { formatFrameLocation } from '../frame-location.util';

describe('formatFrameLocation', () => {
  it('reduces a dev-server bundle URL to the file and position', () => {
    expect(
      formatFrameLocation(
        'http://localhost:8081/packages/@axonpack/expo-devtools/example/index.bundle//&platform=ios&dev=true&hot=false:104857:23'
      )
    ).toBe('index.bundle:104857:23');
  });

  it('drops a query written with a question mark too', () => {
    expect(formatFrameLocation('http://10.0.2.2:8081/index.bundle?platform=android:12:5')).toBe(
      'index.bundle:12:5'
    );
  });

  it('reduces an absolute source path to its basename', () => {
    expect(formatFrameLocation('/Users/me/app/src/components/StackDemo.tsx:24:11')).toBe(
      'StackDemo.tsx:24:11'
    );
  });

  it('keeps a line-only position', () => {
    expect(formatFrameLocation('webview-console-logger.service.ts:110')).toBe(
      'webview-console-logger.service.ts:110'
    );
  });

  it('leaves the engine placeholders alone', () => {
    expect(formatFrameLocation('native')).toBe('native');
    expect(formatFrameLocation('[native code]')).toBe('[native code]');
  });

  it('returns the original when there is no file to name', () => {
    // Shortening this would leave `localhost:8081`, which reads as a file called localhost.
    expect(formatFrameLocation('http://localhost:8081/:1:2')).toBe('http://localhost:8081/:1:2');
  });

  it('has nothing to say about an empty location', () => {
    expect(formatFrameLocation('')).toBe('');
    expect(formatFrameLocation('   ')).toBe('');
  });
});
