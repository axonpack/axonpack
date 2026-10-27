import type { PreviewListLabels, PreviewListTheme } from "../types";

export const LIGHT_THEME: PreviewListTheme = {
  mode: "auto",
  background: "#f4f6fa",
  card: "#ffffff",
  surface: "#eef1f6",
  border: "#e4e8f0",
  title: "#0f172a",
  text: "#334155",
  muted: "#64748b",
  primary: "#2563eb",
  primaryText: "#ffffff",
  danger: "#dc2626",
  warning: "#d97706",
  success: "#16a34a",
  radius: 14,
  fonts: {},
};

export const DARK_THEME: PreviewListTheme = {
  ...LIGHT_THEME,
  background: "#12151f",
  card: "#1c2130",
  surface: "#262c3d",
  border: "#323a4f",
  title: "#f8fafc",
  text: "#cbd5e1",
  muted: "#94a3b8",
  primary: "#5b8def",
  danger: "#f87171",
  warning: "#fbbf24",
  success: "#4ade80",
};

export const DEFAULT_LABELS: PreviewListLabels = {
  title: "Previews",
  running: "Running",
  base: "Embedded bundle",
  backToBase: "Back to base",
  metroBypassed:
    "Debug build: Metro is not used while a preview runs. Go back to base to load from Metro again.",
  refresh: "Refresh",
  empty: "No previews published for this build yet.",
  noBuildKey:
    "This build has no compatibility key, so it cannot list previews. Add the config plugin and rebuild.",
  download: "Download",
  switchTo: "Switch",
  update: "Update",
  delete: "Delete",
  status: {
    available: "Not downloaded",
    downloading: "Downloading",
    downloaded: "Downloaded",
    "update-available": "Update available",
    unpublished: "Unpublished",
    broken: "Broken: it stopped while starting",
  },
  incompatibleTitle: "Incompatible",
  incompatibleHint:
    "Made for another native build. They can't run on this one.",
  deleteAll: "Delete all",
  devPreviewServersTitle: "Dev preview servers",
  devPreviewServersHint:
    "Metro servers for this app on your computer. Debug builds only.",
  noDevPreviewServers:
    "No Metro server found. Start one with npx preview start.",
  noBuildSlug:
    "This build has no app slug, so it cannot tell its servers from other apps'. Add the config plugin and rebuild.",
  stopDevPreviewServer: "Stop using dev preview server",
  localSuffix: "local",
  localIncompatible: "Made for another native build",
  localUnknownBuild: "Native build unknown",
};

/** Merges a partial theme over the light or dark base. */
export const resolveTheme = (
  partial: Partial<PreviewListTheme> | undefined,
  systemScheme: string | null | undefined,
): PreviewListTheme => {
  const mode = partial?.mode ?? "auto";
  const dark = mode === "dark" || (mode === "auto" && systemScheme === "dark");
  const base = dark ? DARK_THEME : LIGHT_THEME;
  return { ...base, ...partial, fonts: { ...base.fonts, ...partial?.fonts } };
};

export const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
