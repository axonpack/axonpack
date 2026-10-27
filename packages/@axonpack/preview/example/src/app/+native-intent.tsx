import { devPreviewServersStore, previewsStore } from "@axonpack/preview";

import { previewConfig as config } from "@/preview-config";

// Links do what the list's buttons do, so a run can be scripted from a terminal:
// previewexample://download/<id>, .../switch/<id>, .../switch/embedded, .../refresh,
// .../delete/<id>, .../deleteincompatible, .../local/<port>, .../localstop
// (`xcrun simctl openurl booted <link>` or `adb shell am start -d <link>`).
// Expo Router would treat them as routes, so each one runs here and lands on the Previews tab.
const ACTIONS: Record<string, (id: string) => void> = {
  download: (id) => id && previewsStore.download(config, id),
  refresh: () => previewsStore.refresh(config),
  delete: (id) => id && previewsStore.remove(id),
  deleteincompatible: () => previewsStore.removeIncompatible(),
  local: (id) => {
    const server = devPreviewServersStore
      .getState()
      .servers.find((s) => String(s.port) === id);
    if (server) devPreviewServersStore.switchTo(server);
  },
  localstop: () => devPreviewServersStore.switchTo(null),
  switch: (id) => previewsStore.switchTo(config, id === "embedded" ? null : id),
};

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  const [, action = "", id = ""] =
    path.replace(/^[a-z]+:\/\//, "").match(/^\/?([a-z]+)\/?(.*)$/) ?? [];
  const run = ACTIONS[action];
  if (!run) return path;
  // As before the router, a link that cold-starts the app only opens it.
  if (!initial) run(id);
  return "/previews";
}
