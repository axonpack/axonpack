import type {
  DevPreviewServer,
  PreviewConfig,
  PreviewItem,
  PreviewStatusInfo,
} from '@axonpack/preview';

import { runAction } from '../../../../../agent/utils/run-action.util';
import { runQuery, type AgentQuery } from '../../../../../agent/utils/run-query.util';
import { previewSupportStore } from '../../stores/preview-support.store';
import { previewAgent } from '../preview-agent.const';

const CONFIG: PreviewConfig = { enabled: true };

const SERVER = {
  hostPort: '127.0.0.1:8082',
  title: 'Login fix',
  announced: true,
  compatible: true,
  branch: 'feat/login',
} as DevPreviewServer;

const PREVIEW = {
  id: 'pr-7',
  status: 'available',
  active: false,
  entry: {
    title: 'Dark mode',
    branch: 'feat/dark',
    publishedAt: '2026-11-01T10:00:00.000Z',
    environment: 'preview',
  },
} as PreviewItem;

const backToDefault = jest.fn(async () => {});
const refresh = jest.fn(async () => {});

const STATUS = {
  running: { kind: 'default', source: 'expo-dev-server', hostPort: 'localhost:8081' },
  bundleKind: 'expo-dev-server',
  title: 'Default',
  branch: null,
  canGoBack: false,
  backToDefault,
  refresh,
} as unknown as PreviewStatusInfo;

const fakePreview = {
  sameServer: (a: string, b: string) => a.split(':')[1] === b.split(':')[1],
  previewsStore: { switchTo: jest.fn(async () => {}) },
  devPreviewServersStore: { switchTo: jest.fn() },
};

const topic = previewAgent(CONFIG, fakePreview as never);
// Each test starts a new query, so `prepare` refreshes and the first reply is a wait.
const ask = async (rest: Partial<AgentQuery> = {}) => {
  const query = { topic: 'preview', ...rest };
  runQuery([topic], query);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return runQuery([topic], query).text;
};
const act = (action: string, args: string[] = [], yes?: true) =>
  runAction([topic], { topic: 'preview', action, args, options: { yes } });

beforeEach(() => {
  jest.clearAllMocks();
  previewSupportStore.setState({ status: STATUS, previews: [PREVIEW], servers: [SERVER] });
});

describe('the preview topic', () => {
  it('lists what runs now, the dev servers, then the previews', async () => {
    expect(await ask()).toBe(
      [
        '# preview · 3 of 3 match',
        'id\tkind\ttitle\tstatus\tbranch\tactive',
        'now\tnow\tDefault\texpo-dev-server\t-\ttrue',
        '127.0.0.1:8082\tserver\tLogin fix\tcompatible\tfeat/login\tfalse',
        'pr-7\tpreview\tDark mode\tavailable\tfeat/dark\tfalse',
        '# next: --after now',
      ].join('\n')
    );
  });

  it('marks the server the app runs from as active', async () => {
    previewSupportStore.setState({ servers: [{ ...SERVER, hostPort: '127.0.0.1:8081' }] });
    expect(await ask({ where: ['kind=server'], fields: 'id,active', json: true })).toBe(
      '{"id":"127.0.0.1:8081","active":true}'
    );
  });

  it("filters and reads a preview's publish time and environment", async () => {
    expect(await ask({ where: ['environment=preview'], fields: 'id,t', json: true })).toBe(
      `{"id":"pr-7","t":${Date.parse('2026-11-01T10:00:00.000Z')}}`
    );
  });

  it('gets the status as preview gives it, without its functions', async () => {
    const now = JSON.parse(await ask({ get: 'now', json: true }));
    expect(now).toMatchObject({ title: 'Default', bundleKind: 'expo-dev-server' });
    expect(Object.keys(now)).not.toContain('refresh');
  });

  it('refreshes on each new query, and answers once the refresh is done', async () => {
    const query = { topic: 'preview', count: true };
    expect(runQuery([topic], query).text).toBe(
      '# wait: asking the bucket for previews and looking for dev servers'
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runQuery([topic], query).text).toBe('3');
    expect(refresh).toHaveBeenCalledTimes(1);
    runQuery([topic], query);
    expect(refresh).toHaveBeenCalledTimes(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    runQuery([topic], query);
  });

  it('is off when the preview config turns previews off', () => {
    const off = previewAgent({ enabled: false }, fakePreview as never);
    expect(runQuery([off], { topic: 'preview' }).text).toBe(
      '# preview is off: previews are off: the config passed to configure() has enabled: false'
    );
  });
});

describe('its actions', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('refuses each without --yes, and restarts nothing', () => {
    previewSupportStore.setState({ status: { ...STATUS, canGoBack: true } });
    expect(act('switch', ['pr-7'])).toBe('error: switch restarts the app, so it needs --yes');
    expect(act('switch', ['127.0.0.1:8082'])).toBe(
      'error: switch restarts the app, so it needs --yes'
    );
    expect(act('default')).toBe('error: default restarts the app, so it needs --yes');
    jest.runAllTimers();
    expect(fakePreview.previewsStore.switchTo).not.toHaveBeenCalled();
    expect(fakePreview.devPreviewServersStore.switchTo).not.toHaveBeenCalled();
    expect(backToDefault).not.toHaveBeenCalled();
  });

  it('switches to a preview, downloading it first, after the reply is out', () => {
    expect(act('switch', ['pr-7'], true)).toBe(
      '# preview · restarting the app on pr-7 once it has downloaded'
    );
    expect(fakePreview.previewsStore.switchTo).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(fakePreview.previewsStore.switchTo).toHaveBeenCalledWith(CONFIG, 'pr-7');
  });

  it('switches to a dev server', () => {
    expect(act('switch', ['127.0.0.1:8082'], true)).toBe(
      '# preview · restarting the app on 127.0.0.1:8082'
    );
    jest.runAllTimers();
    expect(fakePreview.devPreviewServersStore.switchTo).toHaveBeenCalledWith(SERVER);
  });

  it('goes back to the default bundle', () => {
    previewSupportStore.setState({ status: { ...STATUS, canGoBack: true } });
    expect(act('default', [], true)).toBe('# preview · restarting the app on the default bundle');
    jest.runAllTimers();
    expect(backToDefault).toHaveBeenCalled();
  });

  it('refuses what would change nothing, or what it can not find', () => {
    previewSupportStore.setState({ previews: [{ ...PREVIEW, active: true }] });
    expect(act('switch', ['pr-7'], true)).toBe('error: pr-7 runs now');
    expect(act('switch', ['now'], true)).toBe(
      'error: no dev server or preview "now". devtools preview lists them'
    );
    expect(act('default', [], true)).toBe('error: the default bundle runs now');
    expect(act('switch', [], true)).toBe('error: usage: devtools preview switch <id> --yes');
  });
});
