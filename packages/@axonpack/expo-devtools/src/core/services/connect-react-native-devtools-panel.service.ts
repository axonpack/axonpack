import { ReactNativeDevtoolsPanel, ref } from '@axonpack/react-native-devtools-tab';
import { NativeModules } from 'react-native';

import { consoleLogStore } from '../../features/console/stores/console-log.store';
import { crashStore } from '../../features/crash/stores/crash.store';
import { networkLogStore } from '../../features/network/stores/network-log.store';
import { storageStore } from '../../features/storage/stores/storage.store';

/**
 * The panel is served by the dev server the bundle came from, which is the only address that holds
 * on a simulator, an emulator and a device at once.
 */
function devServerOrigin(): string {
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  return scriptURL?.match(/^https?:\/\/[^/]+/)?.[0] ?? 'http://localhost:8081';
}

let started = false;

/**
 * Mirrors the on-device panel into React Native DevTools.
 *
 * The layout is registered once; after that only the counts cross the wire, and only the slices that
 * changed. A store that nobody is writing to costs nothing.
 */
export function connectReactNativeDevtoolsPanel(): void {
  if (started) return;
  started = true;

  ReactNativeDevtoolsPanel.registerTab({
    id: 'network',
    name: 'Network',
    // A page of ours, not a described layout. A request table with eight detail tabs and a sandbox
    // is well past what the tab vocabulary can say, and this is what the escape hatch is for.
    url: `${devServerOrigin()}/axonpack-panel/index.html`,
    state: {},
  });

  const overview = ReactNativeDevtoolsPanel.registerTab({
    id: 'overview',
    name: 'Axonpack',
    icon: '◬',
    state: { requests: '0', failed: '0', logs: '0', crashes: '0', stores: '0' },
    layout: {
      kind: 'stack',
      children: [
        { kind: 'heading', value: 'Axonpack' },
        { kind: 'field', label: 'requests', value: ref('requests') },
        { kind: 'field', label: 'failed', value: ref('failed'), tone: 'error' },
        { kind: 'field', label: 'console', value: ref('logs') },
        { kind: 'field', label: 'crashes', value: ref('crashes') },
        { kind: 'field', label: 'stores', value: ref('stores') },
        { kind: 'divider' },
        {
          kind: 'row',
          children: [
            { kind: 'button', label: 'Clear requests', action: 'clearNetwork' },
            { kind: 'button', label: 'Clear console', action: 'clearConsole' },
          ],
        },
      ],
    },
  });

  const pushNetwork = () => {
    const rows = networkLogStore.getMergedSnapshot();
    overview.setState({
      requests: String(rows.length),
      failed: String(rows.filter((row) => row.kind === 'http' && row.status === 'error').length),
    });
  };

  networkLogStore.subscribe(pushNetwork);
  consoleLogStore.subscribe(() =>
    overview.setState({ logs: String(consoleLogStore.getSnapshot().length) })
  );
  crashStore.subscribe(() =>
    overview.setState({ crashes: String(crashStore.getSnapshot().length) })
  );
  storageStore.subscribe(() =>
    overview.setState({ stores: String(storageStore.getSnapshot().adapters.length) })
  );

  overview.onAction('clearNetwork', () => networkLogStore.clear());
  overview.onAction('clearConsole', () => consoleLogStore.clear());
}

/**
 * Started at import rather than from `startDevtools`, so the channel is already waiting by the time
 * the app has finished importing.
 *
 * `__DEV__` rather than `config.enabled`, because a release build has no DevTools to connect to at
 * all. It is a compile-time constant, so the whole thing goes away in one.
 */
if (__DEV__) connectReactNativeDevtoolsPanel();
