import {
  DARK_THEME,
  LIGHT_THEME,
} from "../../constants/preview-list/theme.const";
import type {
  DevtoolsPaletteLike,
  PreviewListTheme,
  PreviewListThemeInput,
} from "../../components/preview-list/preview-list.types";

/** WCAG relative luminance of `#rgb` or `#rrggbb[aa]` (alpha ignored); 0 for anything else. */
export function luminance(color: string): number {
  let hex = color.trim().replace(/^#/, "");
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}/i.test(hex)) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const isDevtoolsPalette = (
  input: PreviewListThemeInput | undefined,
): input is DevtoolsPaletteLike =>
  !!input && "textPrimary" in input && "accent" in input;

/**
 * Maps an expo-devtools palette onto the list's theme. Its `surface` is what it raises off the
 * background, so that is the card here, and its selected-row tint fills the list's quieter areas.
 */
export function fromDevtoolsPalette(
  palette: DevtoolsPaletteLike,
): Partial<PreviewListTheme> {
  const tint = palette.sectionTint ?? palette.surface;
  return {
    mode: luminance(palette.background) < 0.2 ? "dark" : "light",
    background: palette.background,
    card: palette.surface,
    surface: tint,
    tint,
    tintBorder: palette.border,
    border: palette.border,
    title: palette.textPrimary,
    text: palette.textPrimary,
    muted: palette.textSecondary,
    primary: palette.accent,
    // The palette has no colour for text on its accent, so take whichever of white or black reads.
    primaryText:
      contrastRatio("#ffffff", palette.accent) >=
      contrastRatio("#000000", palette.accent)
        ? "#ffffff"
        : "#000000",
    danger: palette.error,
    ...(palette.errorSurface ? { dangerSurface: palette.errorSurface } : {}),
    warning: palette.warning,
    success: palette.success,
  };
}

/** Merges the app's theme over the light or dark base; an expo-devtools palette is mapped first. */
export const resolveTheme = (
  input: PreviewListThemeInput | undefined,
  systemScheme: string | null | undefined,
): PreviewListTheme => {
  const partial = isDevtoolsPalette(input) ? fromDevtoolsPalette(input) : input;
  const mode = partial?.mode ?? "auto";
  const dark = mode === "dark" || (mode === "auto" && systemScheme === "dark");
  const base = dark ? DARK_THEME : LIGHT_THEME;
  return { ...base, ...partial, fonts: { ...base.fonts, ...partial?.fonts } };
};

export const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** A custom font family replaces the weight, since most families ship one file per weight. */
export const font = (
  theme: PreviewListTheme,
  weight: "regular" | "medium" | "bold",
  size: number,
) => {
  const family = theme.fonts[weight];
  return {
    fontSize: size,
    ...(family
      ? { fontFamily: family }
      : {
          fontWeight: (weight === "bold"
            ? "700"
            : weight === "medium"
              ? "600"
              : "400") as "700" | "600" | "400",
        }),
  };
};
