import { File } from "expo-file-system";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import { rootDirectory } from "../previews/local-previews.service";

// Beside the native state.json, which holds the picked server's URL. Native writes that one, so
// what JS knows about the server goes in a file of its own.
const file = () => new File(rootDirectory(), "server.json");

/** The server the app ran from, as last seen answering, so a reload still knows its name and kind. */
export async function readRunningServer(): Promise<DevPreviewServer | null> {
  try {
    const saved = file();
    return saved.exists
      ? (JSON.parse(await saved.text()) as DevPreviewServer)
      : null;
  } catch {
    return null;
  }
}

export async function saveRunningServer(
  server: DevPreviewServer,
): Promise<void> {
  try {
    const saved = file();
    if (!saved.exists) saved.create({ intermediates: true });
    await saved.write(JSON.stringify(server));
  } catch {
    // Not fatal: after a reload, a server that has stopped is shown by its address.
  }
}
