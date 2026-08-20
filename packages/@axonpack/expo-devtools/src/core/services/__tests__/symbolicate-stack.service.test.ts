import { resetSymbolication, symbolicateStack } from '../symbolicate-stack.service';
import { parseStack } from '../../utils/parse-stack.util';

const ESC = String.fromCharCode(27);

function mockFetch(payload: unknown, ok = true) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(payload),
  });
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  return fetchMock;
}

const DEV_STACK = parseStack(
  [
    '    at pay (http://localhost:8081/index.bundle//&platform=ios&dev=true:104857:23)',
    '    at onPress (http://localhost:8081/index.bundle//&platform=ios&dev=true:98122:7)',
  ].join('\n')
);

describe('symbolicateStack', () => {
  beforeEach(() => {
    resetSymbolication();
  });

  it('asks the dev server the frames themselves name', async () => {
    const fetchMock = mockFetch({
      stack: [
        {
          methodName: 'pay',
          file: '/app/example/components/CrashDemo.tsx',
          lineNumber: 24,
          column: 11,
        },
        { methodName: 'onPress', file: '/app/example/App.tsx', lineNumber: 57, column: 9 },
      ],
    });

    const result = await symbolicateStack('crash-1', DEV_STACK);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8081/symbolicate',
      expect.objectContaining({ method: 'POST' })
    );
    // The request carries the file *unshortened* — Metro resolves it against the source map by URL.
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.stack[0]).toEqual({
      file: 'http://localhost:8081/index.bundle//&platform=ios&dev=true',
      lineNumber: 104857,
      column: 23,
      methodName: 'pay',
    });
    expect(result?.frames[0]).toEqual({
      fn: 'pay',
      location: '/app/example/components/CrashDemo.tsx:24:11',
      vendor: false,
    });
  });

  it('contacts nobody when no frame came from a dev server', async () => {
    const fetchMock = mockFetch({});
    const release = parseStack('    at pay (address at /app.bundle:12:5)');

    expect(await symbolicateStack('crash-2', release)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('strips the ANSI colouring Metro writes for a terminal', async () => {
    mockFetch({
      stack: [],
      codeFrame: {
        content:
          `${ESC}[0m${ESC}[90m  23 |${ESC}[39m const res = await gateway();\n` +
          `${ESC}[31m${ESC}[1m>${ESC}[22m${ESC}[39m${ESC}[90m 24 |${ESC}[39m throw new Error('x');\n` +
          `${ESC}[90m     |${ESC}[39m       ${ESC}[31m${ESC}[1m^${ESC}[22m${ESC}[39m`,
        fileName: '/app/example/components/CrashDemo.tsx',
        location: { row: 24, column: 11 },
      },
    });

    const result = await symbolicateStack('crash-3', DEV_STACK);

    expect(result?.codeFrames[0]?.content).toBe(
      "  23 | const res = await gateway();\n> 24 | throw new Error('x');\n     |       ^"
    );
    expect(result?.codeFrames[0]?.location).toEqual({ row: 24, column: 11 });
  });

  // Verified against a running Metro: an unmappable frame is echoed back with its bundle URL and a
  // null position, and carries `collapse: true` whatever it is.
  it('keeps the raw frame, and its own vendor flag, for anything Metro could not map', async () => {
    mockFetch({
      stack: [
        {
          methodName: 'pay',
          file: 'http://localhost:8081/index.bundle//&platform=ios&dev=true',
          lineNumber: null,
          column: null,
          collapse: true,
        },
      ],
    });

    const result = await symbolicateStack('crash-4', DEV_STACK);

    expect(result?.frames[0]).toEqual(DEV_STACK[0]);
    expect(result?.frames[0]?.vendor).toBe(false);
  });

  // A positionless frame (`native`) is sent as line 0 and echoed back as line 0, mapped or not.
  it('leaves a positionless frame as it found it', async () => {
    const stack = parseStack(
      [
        '    at pay (http://localhost:8081/index.bundle//&platform=ios&dev=true:104857:23)',
        '    at forEach (native)',
      ].join('\n')
    );
    mockFetch({
      stack: [
        {
          methodName: 'run',
          file: '/app/CrashDemo.tsx',
          lineNumber: 79,
          column: 25,
          collapse: false,
        },
        { methodName: 'forEach', file: 'native', lineNumber: 0, column: 0, collapse: false },
      ],
    });

    const result = await symbolicateStack('crash-10', stack);

    expect(result?.frames[0]?.location).toBe('/app/CrashDemo.tsx:79:25');
    expect(result?.frames[1]).toEqual(stack[1]);
  });

  it("trusts Metro's own collapse flag over the path heuristic", async () => {
    mockFetch({
      stack: [
        {
          methodName: 'renderRoot',
          file: '/app/react/Renderer.js',
          lineNumber: 1,
          column: 1,
          collapse: true,
        },
      ],
    });

    const result = await symbolicateStack('crash-5', DEV_STACK);

    expect(result?.frames[0]?.vendor).toBe(true);
  });

  // Two requests, as LogBox does: Metro answers with one code frame per request, so the component
  // stack's snippet can only come from a second one.
  it('asks a second time for the component stack, and shows both sources', async () => {
    const fetchMock = jest.fn().mockImplementation((_url: string, init: { body: string }) => {
      const sent = JSON.parse(init.body).stack[0].methodName;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            stack: [{ methodName: sent, file: `/app/${sent}.tsx`, lineNumber: 5, column: 5 }],
            codeFrame: { content: `frame for ${sent}`, fileName: `/app/${sent}.tsx` },
          }),
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const componentFrames = parseStack(
      '    at ActionButton (http://localhost:8081/index.bundle//&platform=ios:5:5)'
    );
    const result = await symbolicateStack('crash-11', DEV_STACK, componentFrames);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result?.codeFrames.map((frame) => frame.content)).toEqual([
      'frame for pay',
      'frame for ActionButton',
    ]);
    expect(result?.componentFrames[0]?.fn).toBe('ActionButton');
  });

  it('shows one source when both stacks answer with the same snippet', async () => {
    // A component that throws in its own render answers both requests with the same lines.
    mockFetch({
      stack: [{ methodName: 'render', file: '/app/ActionButton.tsx', lineNumber: 5, column: 5 }],
      codeFrame: { content: 'the same lines', fileName: '/app/ActionButton.tsx' },
    });

    const componentFrames = parseStack(
      '    at ActionButton (http://localhost:8081/index.bundle//&platform=ios:5:5)'
    );
    const result = await symbolicateStack('crash-12', DEV_STACK, componentFrames);

    expect(result?.codeFrames).toHaveLength(1);
  });

  it('falls back to the raw frames when the dev server refuses', async () => {
    mockFetch({}, false);
    expect(await symbolicateStack('crash-6', DEV_STACK)).toBeNull();
  });

  it('never lets a network failure reach the panel', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('connection refused')) as unknown as typeof globalThis.fetch;

    expect(await symbolicateStack('crash-7', DEV_STACK)).toBeNull();
  });

  it('asks once per record, however often the sheet is opened', async () => {
    const fetchMock = mockFetch({
      stack: [{ methodName: 'pay', file: '/app/x.tsx', lineNumber: 1, column: 1 }],
    });

    await symbolicateStack('crash-8', DEV_STACK);
    await symbolicateStack('crash-8', DEV_STACK);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries after a failure — the dev server may have been restarting', async () => {
    const failing = mockFetch({}, false);
    await symbolicateStack('crash-9', DEV_STACK);
    expect(failing).toHaveBeenCalledTimes(1);

    const succeeding = mockFetch({
      stack: [{ methodName: 'pay', file: '/app/x.tsx', lineNumber: 1, column: 1 }],
    });
    expect(await symbolicateStack('crash-9', DEV_STACK)).not.toBeNull();
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});
