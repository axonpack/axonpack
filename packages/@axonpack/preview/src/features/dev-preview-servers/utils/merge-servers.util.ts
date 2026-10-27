import {
  appVersionOf,
  compatibilityOf,
  type AppConfig,
} from "../../../core/utils/expo-config.util";
import {
  compatibilityKey,
  type Platform,
} from "../../../core/utils/layout.util";
import type { RegisteredServer } from "../../../core/constants/dev-preview-servers.const";

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
 * incompatible, and a server found both ways uses the registry's details.
 */
export function mergeServers(input: {
  registry: RegisteredServer[];
  scanned: ScannedServer[];
  /** The slug the config plugin baked into the build. Only its servers are listed. */
  appSlug: string;
  buildKey: string | null;
  platform: Platform;
}): DevPreviewServer[] {
  const servers: DevPreviewServer[] = [];
  for (const found of input.scanned) {
    const announced = input.registry.find((r) => r.port === found.port);
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
