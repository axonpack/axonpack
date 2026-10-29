import type { PreviewStatus } from "../../utils/previews/preview-items.util";

export type PreviewListFonts = {
  /** Font family names, as registered in your app. Each falls back to the system font. */
  regular?: string;
  medium?: string;
  bold?: string;
};

export type PreviewListTheme = {
  /** "auto" follows the device appearance. Default "auto". */
  mode: "auto" | "light" | "dark";
  background: string;
  card: string;
  /** Behind the changelog and the progress track. */
  surface: string;
  /** A wash of the primary colour: the hero card and chips. */
  tint: string;
  border: string;
  title: string;
  text: string;
  /** Quiet text: branch, author, date, size. */
  muted: string;
  primary: string;
  primaryText: string;
  danger: string;
  warning: string;
  success: string;
  /** Card corner radius. Buttons scale from it. Default 14. */
  radius: number;
  fonts: PreviewListFonts;
};

/**
 * The colours an app already hands `@axonpack/expo-devtools` (its `Palette`), so one palette can
 * style both. Typed by shape only, so this package does not depend on expo-devtools.
 */
export type DevtoolsPaletteLike = {
  background: string;
  surface: string;
  sectionTint?: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  success: string;
  error: string;
  warning: string;
};

/** What the list's `theme` prop takes: nothing, a partial theme, or an expo-devtools palette. */
export type PreviewListThemeInput =
  Partial<PreviewListTheme> | DevtoolsPaletteLike;

export type PreviewListLabels = {
  title: string;
  /** What is running now. */
  running: string;
  base: string;
  backToBase: string;
  /** Shown in a debug build while a preview runs, since Metro is not used then. */
  metroBypassed: string;
  refresh: string;
  empty: string;
  noBuildKey: string;
  download: string;
  switchTo: string;
  update: string;
  delete: string;
  status: Record<PreviewStatus, string>;
  incompatibleTitle: string;
  incompatibleHint: string;
  deleteAll: string;
  /** Above the published previews. */
  previewsTitle: string;
  devPreviewServersTitle: string;
  devPreviewServersHint: string;
  noDevPreviewServers: string;
  /** In place of the servers, when the build has no slug baked in by the config plugin. */
  noBuildSlug: string;
  stopDevPreviewServer: string;
  /** After the title in the header line, for a dev preview server. */
  localSuffix: string;
  localIncompatible: string;
  localUnknownBuild: string;
};
