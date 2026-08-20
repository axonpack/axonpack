import { parseComponentStack, parseStack } from '../parse-stack.util';

describe('parseStack', () => {
  it('parses Hermes/V8 frames into a name and a location', () => {
    const frames = parseStack(
      [
        'Error: boom',
        '    at loadUser (address at /app.bundle:12:5)',
        '    at /app.bundle:5:1',
      ].join('\n')
    );

    expect(frames[0]).toEqual({
      fn: 'loadUser',
      location: 'address at /app.bundle:12:5',
      vendor: false,
    });
    // A frame with no recorded function name still carries its location, which is the useful half.
    expect(frames[1]).toEqual({ fn: '<anonymous>', location: '/app.bundle:5:1', vendor: false });
  });

  it('parses JavaScriptCore frames, which use a different shape entirely', () => {
    const frames = parseStack('loadUser@http://localhost:8081/index.bundle:12:5');

    expect(frames[0]).toEqual({
      fn: 'loadUser',
      location: 'http://localhost:8081/index.bundle:12:5',
      vendor: false,
    });
  });

  it('marks library frames as vendor so app frames stand out', () => {
    const frames = parseStack('    at render (/app/node_modules/react-native/index.js:1:1)');
    expect(frames[0]?.vendor).toBe(true);
  });

  it('keeps a frame it cannot parse rather than shortening the trace', () => {
    const frames = parseStack('something entirely unexpected');
    expect(frames).toHaveLength(1);
    expect(frames[0]?.fn).toBe('something entirely unexpected');
  });

  it('returns nothing for a missing stack', () => {
    expect(parseStack(null)).toEqual([]);
  });
});

describe('parseComponentStack — React 19 shape', () => {
  // React 19 writes component stacks in the error-stack shape, which is what makes them
  // symbolicable; parsing them as the old `in Foo (at Bar)` form left one raw line per entry.
  it('parses a modern component stack into names and locations', () => {
    const frames = parseComponentStack(
      [
        '    at ActionButton (http://localhost:8081/index.bundle//&platform=ios:5:5)',
        '    at View (http://localhost:8081/index.bundle//&platform=ios:125:1)',
      ].join('\n')
    );

    expect(frames[0]).toEqual({
      fn: 'ActionButton',
      location: 'http://localhost:8081/index.bundle//&platform=ios:5:5',
      vendor: false,
    });
    expect(frames).toHaveLength(2);
  });

  it('still parses the React 18 shape', () => {
    const frames = parseComponentStack('    in ActionButton (at App.tsx:24)');
    expect(frames[0]).toEqual({ fn: 'ActionButton', location: 'App.tsx:24', vendor: false });
  });
});

describe('parseComponentStack', () => {
  it('splits React frames into component and file', () => {
    const frames = parseComponentStack('\n    in ProfileScreen (at App.tsx:42)\n    in App');

    expect(frames[0]).toEqual({ fn: 'ProfileScreen', location: 'App.tsx:42', vendor: false });
    expect(frames[1]).toEqual({ fn: 'App', location: '', vendor: false });
  });

  it('returns nothing when React gave us no component stack', () => {
    expect(parseComponentStack(undefined)).toEqual([]);
  });
});
