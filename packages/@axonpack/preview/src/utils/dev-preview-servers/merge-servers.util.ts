import {
  appVersionOf,
  compatibilityOf,
  type AppConfig,
} from "../config/expo-config.util";
import { compatibilityKey, type Platform } from "../previews/layout.util";
import type { RegisteredServer } from "../../constants/dev-preview-servers/dev-preview-servers.const";
import { sameServer } from "../previews/running.util";

/** A Metro server on the developer's computer that this app can run from (debug builds only). */
export type DevPreviewServer = {
  /** `host:port`, also what Android's dev support connects to. */
  hostPort: string;
  host: string;
  port: number;
  /** The bundle URL the server's manifest gives for this platform; what iOS loads. */
  url: string;
  title: string;
  name: string;
  slug: string;
  version: string | null;
  branch: string | null;
  worktree: string | null;
  /** The native build key the server's code is for; null when it cannot be told. */
  key: string | null;
  /** Whether `key` matches the installed build: true, false, or null for "unknown". */
  compatible: boolean | null;
  /** Announced by `preview start` (with branch and worktree), or only found by the scan. */
  announced: boolean;
  /**
   * Only on the server the app runs from, when no look ever found it answering and nothing was
   * saved about it: whether it is an Expo or a preview server, and its name, are not known.
   */
  unknown?: true;
};

export type ScannedServer = {
  host: string;
  port: number;
  url: string;
  expo: AppConfig & { slug?: string; name?: string };
};

/**
 * Turns what the registry announced and what the scan found into this app's list: other apps'
 * servers (another slug) are left out, the same app with another native key is kept but marked
 * incompatible, and a server found both ways uses the registry's details. An announcement belongs
 * to its host and port only, never to a server that merely shares the app's slug or name.
 */
export function mergeServers(input: {
  registry: RegisteredServer[];
  /** Where the registry answered, which is the machine its ports are on. Default: this computer. */
  registryHost?: string | null;
  scanned: ScannedServer[];
  /** The slug the config plugin baked into the build. Only its servers are listed. */
  appSlug: string;
  buildKey: string | null;
  platform: Platform;
}): DevPreviewServer[] {
  const servers: DevPreviewServer[] = [];
  const registryHost = input.registryHost ?? "localhost";
  for (const found of input.scanned) {
    const announced = input.registry.find((r) =>
      sameServer(`${registryHost}:${r.port}`, `${found.host}:${found.port}`),
    );
    const slug = announced?.slug ?? found.expo.slug ?? "";
    if (slug !== input.appSlug) continue;
    const key =
      announced?.keys[input.platform] ??
      (compatibilityOf(found.expo) === "appVersion"
        ? compatibilityKey(
            "appVersion",
            appVersionOf(found.expo, input.platform),
          )
        : null);
    servers.push({
      hostPort: `${found.host}:${found.port}`,
      host: found.host,
      port: found.port,
      url: found.url,
      title: announced?.title || found.expo.name || slug,
      name: announced?.name ?? found.expo.name ?? "",
      slug,
      version: appVersionOf(found.expo, input.platform) || null,
      branch: announced?.branch || null,
      worktree: announced?.worktree || null,
      key,
      compatible: key && input.buildKey ? key === input.buildKey : null,
      announced: Boolean(announced),
    });
  }
  return servers.sort((a, b) => a.port - b.port);
}
