import type {
  DevPreviewServer,
  PreviewConfig,
  PreviewItem,
  PreviewStatusInfo,
} from '@axonpack/preview';

import type { AgentTopic } from '../../../../agent/constants/agent-topics.const';
import { previewSupportStore } from '../stores/preview-support.store';

type PreviewModule = typeof import('@axonpack/preview');

/** `usePreviewStatus()` without its two functions, which JSON and `--grep` have no use for. */
type StatusData = Omit<PreviewStatusInfo, 'backToDefault' | 'refresh'>;

/**
 * One row: what runs now (id `now`), a dev server (id its `host:port`) or a preview (its id).
 * `data` is preview's own object for it, which `get` prints.
 */
export type PreviewAgentRow = {
  id: string;
  title?: string;
  /**
   * `now`: where it comes from (`built-in`, `expo-dev-server`, `dev-preview-server`, `preview`,
   * `server`). A server: `compatible`, `incompatible` or `unknown`, for this build. A preview: its
   * status in the list (`available`, `downloaded`, `update-available`, ...).
   */
  status: string;
  branch?: string | null;
  /** It runs now. Always true for `now`. */
  active: boolean;
  /** A preview's publish time. */
  t?: number;
  environment?: string;
} & (
  | { kind: 'now'; data: StatusData }
  | { kind: 'server'; data: DevPreviewServer }
  | { kind: 'preview'; data: PreviewItem }
);

// ponytail: a fixed wait so the reply reaches the CLI before the app restarts. On a slow link the
// reply can still be lost; the switch happens either way, and `devtools preview` shows it.
const RESTART_AFTER_MS = 300;

function rows(sameServer: PreviewModule['sameServer']): PreviewAgentRow[] {
  const { status, servers, previews } = previewSupportStore.getState();
  if (!status) return [];
  const { backToDefault, refresh, ...now } = status;
  const { running } = status;
  return [
    {
      id: 'now',
      kind: 'now',
      title: status.title,
      status: status.bundleKind,
      branch: status.branch,
      active: true,
      data: now,
    },
    ...servers.map((server): PreviewAgentRow => ({
      id: server.hostPort,
      kind: 'server',
      // Only `preview start` names a server. Metro gives the app's name, the same on every one.
      title: server.announced ? server.title : undefined,
      status:
        server.compatible === null ? 'unknown' : server.compatible ? 'compatible' : 'incompatible',
      branch: server.branch,
      active:
        running.kind !== 'preview' &&
        running.hostPort !== null &&
        sameServer(server.hostPort, running.hostPort),
      data: server,
    })),
    ...previews.map((item): PreviewAgentRow => ({
      id: item.id,
      kind: 'preview',
      title: item.entry.title,
      status: item.status,
      branch: item.entry.branch,
      active: item.active,
      t: Date.parse(item.entry.publishedAt) || undefined,
      environment: item.entry.environment,
      data: item,
    })),
  ];
}

/**
 * True while this topic's last reply was a `# wait:`, so the CLI asking again waits on the same
 * refresh and the next new query starts another.
 */
let waiting = false;
let refreshing = false;

/** Each new query asks the bucket again and looks for dev servers, as the list's Refresh does. */
function prepare(): string | undefined {
  const status = previewSupportStore.getState().status;
  if (!waiting && status) {
    refreshing = true;
    // A failed look still ends the wait; the list's own error shows in the `now` row.
    status
      .refresh()
      .catch(() => undefined)
      .then(() => {
        refreshing = false;
      });
  }
  waiting = refreshing;
  return waiting ? 'asking the bucket for previews and looking for dev servers' : undefined;
}

const needsYes = (action: string, yes?: boolean) => {
  if (yes !== true) throw new Error(`${action} restarts the app, so it needs --yes`);
};

/**
 * The `preview` topic for the `devtools` command line tool, read from the support's store. Its
 * actions switch the way the list's buttons do, so the AI Usage tab logs them like any other action.
 */
export function previewAgent(
  config: PreviewConfig,
  preview: PreviewModule
): AgentTopic<PreviewAgentRow> {
  const list = () => rows(preview.sameServer);
  return {
    name: 'preview',
    about:
      'what runs now (id now), the dev servers (id host:port) and the previews for this build. switch <id> --yes and default --yes restart the app',
    rows: list,
    enabled: () => config.enabled,
    off: 'previews are off: the config passed to configure() has enabled: false',
    prepare,
    fields: {
      id: (r) => r.id,
      t: (r) => r.t,
      kind: (r) => r.kind,
      title: (r) => r.title,
      status: (r) => r.status,
      branch: (r) => r.branch,
      active: (r) => r.active,
      environment: (r) => r.environment,
    },
    show: ['id', 'kind', 'title', 'status', 'branch', 'active'],
    detail: (r) => r.data,
    actions: {
      switch: {
        usage: '<id> --yes',
        args: [1, 1],
        options: ['yes'],
        run: ([id], options) => {
          const row = list().find((each) => each.id === id && each.kind !== 'now');
          if (!row)
            throw new Error(`no dev server or preview "${id}". devtools preview lists them`);
          if (row.active) throw new Error(`${id} runs now`);
          if (row.kind === 'preview' && row.status === 'downloading') {
            throw new Error(`${id} is downloading. Switch to it once its status is downloaded`);
          }
          needsYes('switch', options.yes);
          setTimeout(
            () =>
              row.kind === 'server'
                ? preview.devPreviewServersStore.switchTo(row.data)
                : preview.previewsStore.switchTo(config, id),
            RESTART_AFTER_MS
          );
          const downloadFirst = row.kind === 'preview' && row.status === 'available';
          return `# preview · restarting the app on ${id}${downloadFirst ? ' once it has downloaded' : ''}`;
        },
      },
      default: {
        usage: '--yes',
        args: [0, 0],
        options: ['yes'],
        run: (_, options) => {
          const status = previewSupportStore.getState().status;
          if (!status?.canGoBack) throw new Error('the default bundle runs now');
          needsYes('default', options.yes);
          setTimeout(status.backToDefault, RESTART_AFTER_MS);
          return '# preview · restarting the app on the default bundle';
        },
      },
    },
  };
}
