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

const needsYes = (action: string, does: string, yes?: boolean) => {
  if (yes !== true) throw new Error(`${action} ${does}, so it needs --yes`);
};

/**
 * The `preview` topic for the `devtools` command line tool, read from the support's store. Its
 * actions call what the list's buttons call, and refuse where the list shows no such button, so the
 * CLI tab logs them like any other action.
 */
export function previewAgent(
  config: PreviewConfig,
  preview: PreviewModule
): AgentTopic<PreviewAgentRow> {
  const list = () => rows(preview.sameServer);
  const previewRow = (id: string) => {
    const row = list().find((each) => each.id === id);
    if (row?.kind !== 'preview') {
      throw new Error(`no preview "${id}". devtools preview --where kind=preview lists them`);
    }
    return row;
  };
  // Preview's store keeps a failure in its `error` rather than throwing it.
  const finish = (run: Promise<void>, done: string) =>
    run.then(() => {
      const { error } = preview.previewsStore.getState();
      if (error) throw new Error(error);
      return `# preview · ${done}`;
    });
  return {
    name: 'preview',
    about:
      'what runs now (id now), the dev servers (id host:port) and the previews for this build. switch <id> and default restart the app, download, update and delete <id> change what is on the device, each with --yes',
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
          needsYes('switch', 'restarts the app', options.yes);
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
          needsYes('default', 'restarts the app', options.yes);
          setTimeout(status.backToDefault, RESTART_AFTER_MS);
          return '# preview · restarting the app on the default bundle';
        },
      },
      download: {
        usage: '<id> --yes',
        args: [1, 1],
        options: ['yes'],
        run: ([id], options) => {
          const { status } = previewRow(id);
          if (status === 'update-available') {
            throw new Error(
              `${id} is on the device and has an update: devtools preview update ${id} --yes`
            );
          }
          if (status !== 'available') {
            throw new Error(`${id} is ${status}. Only an available preview downloads`);
          }
          needsYes('download', 'writes the preview to the device', options.yes);
          return {
            waitingFor: `downloading ${id}`,
            answer: finish(preview.previewsStore.download(config, id), `downloaded ${id}`),
          };
        },
      },
      update: {
        usage: '<id> --yes',
        args: [1, 1],
        options: ['yes'],
        run: ([id], options) => {
          const { status, active } = previewRow(id);
          if (status !== 'update-available')
            throw new Error(`${id} has no update. It is ${status}`);
          needsYes('update', 'replaces the download on the device', options.yes);
          const next = active ? '. The app runs the new copy from its next start' : '';
          return {
            waitingFor: `updating ${id}`,
            answer: finish(preview.previewsStore.download(config, id), `updated ${id}${next}`),
          };
        },
      },
      delete: {
        usage: '<id> --yes',
        args: [1, 1],
        options: ['yes'],
        run: ([id], options) => {
          const { status, data } = previewRow(id);
          if (!data.local) throw new Error(`${id} isn't on the device`);
          if (status === 'downloading') {
            throw new Error(`${id} is downloading. Delete it once the download ends`);
          }
          needsYes('delete', 'removes the download from the device', options.yes);
          // Preview goes back to the default bundle first when it deletes the chosen one.
          if (preview.previewsStore.getState().activeId === id) {
            setTimeout(() => preview.previewsStore.remove(id), RESTART_AFTER_MS);
            return `# preview · deleting ${id} and restarting the app on the default bundle`;
          }
          return {
            waitingFor: `deleting ${id}`,
            answer: finish(preview.previewsStore.remove(id), `deleted ${id}`),
          };
        },
      },
    },
  };
}
