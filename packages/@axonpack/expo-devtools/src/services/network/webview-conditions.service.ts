import { networkConditionsStore } from '../../stores/network/network-conditions.store';

/** The slice of a `<WebView>` instance this service needs — avoids depending on the WebView types. */
type InjectableWebView = {
  injectJavaScript: (script: string) => void;
};

/** Where the injected script reads the current conditions from, inside the page's own window. */
export const CONDITIONS_GLOBAL = '__axonpackDevtoolsConditions';

const registry = new Map<string, InjectableWebView>();
const refCallbacks = new Map<string, (instance: InjectableWebView | null) => void>();
let unsubscribe: (() => void) | null = null;

/** The statement that (re)seeds the page's conditions global — used both at injection and on push. */
export function buildConditionsScript(): string {
  return `window.${CONDITIONS_GLOBAL} = ${JSON.stringify(networkConditionsStore.resolve())};`;
}

function pushTo(webview: InjectableWebView) {
  try {
    webview.injectJavaScript(`${buildConditionsScript()} true;`);
  } catch {
    // A WebView torn down between the store change and this push — nothing to do.
  }
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
