import { File } from "expo-file-system";

import {
  type HostAddress,
  formatHost,
  parseHost,
} from "../../utils/dev-preview-servers/hosts.util";
import { rootDirectory } from "../previews/local-previews.service";

// Beside server.json, as the hosts were typed, so the file reads plainly.
const file = () => new File(rootDirectory(), "hosts.json");

/** The hosts added on this device. An entry that no longer reads as a host is left out. */
export async function readHosts(): Promise<HostAddress[]> {
  try {
    const saved = file();
    if (!saved.exists) return [];
    const list: unknown = JSON.parse(await saved.text());
    return Array.isArray(list)
      ? list
          .map((text) => parseHost(String(text)))
          .filter((host): host is HostAddress => host !== null)
      : [];
  } catch {
    return [];
  }
}

export async function saveHosts(hosts: HostAddress[]): Promise<void> {
  try {
    const saved = file();
    if (!saved.exists) saved.create({ intermediates: true });
    await saved.write(JSON.stringify(hosts.map(formatHost)));
  } catch {
    // Not fatal: the hosts still work until the app restarts.
  }
}
