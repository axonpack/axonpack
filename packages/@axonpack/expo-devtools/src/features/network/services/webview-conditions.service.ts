import { networkConditionsStore } from '../stores/network-conditions.store';

type InjectableWebView = {
  injectJavaScript: (script: string) => void;
};

export const CONDITIONS_GLOBAL = '__axonpackDevtoolsConditions';

const registry = new Map<string, InjectableWebView>();
const refCallbacks = new Map<string, (instance: InjectableWebView | null) => void>();
let unsubscribe: (() => void) | null = null;

export function buildConditionsScript(): string {
  return `window.${CONDITIONS_GLOBAL} = ${JSON.stringify(networkConditionsStore.resolve())};`;
}

function pushTo(webview: InjectableWebView) {
  try {
    webview.injectJavaScript(`${buildConditionsScript()} true;`);
  } catch {}
}

function pushToAll() {
  for (const webview of registry.values()) pushTo(webview);
}

export function pushConditionsToWebView(source: string) {
  const webview = registry.get(source);
  if (webview) pushTo(webview);
}

export function shouldAllowWebViewRequest(): boolean {
  return !networkConditionsStore.resolve().offline;
}

export function getWebViewConditionsRef(source: string) {
  let callback = refCallbacks.get(source);
  if (!callback) {
    callback = (instance: InjectableWebView | null) => {
      if (!instance) {
        registry.delete(source);
        return;
      }
      registry.set(source, instance);
      if (!unsubscribe) unsubscribe = networkConditionsStore.subscribe(pushToAll);
    };
    refCallbacks.set(source, callback);
  }
  return callback;
}

export function getWebViewUserAgent(): string | undefined {
  return networkConditionsStore.resolve().userAgent ?? undefined;
}
