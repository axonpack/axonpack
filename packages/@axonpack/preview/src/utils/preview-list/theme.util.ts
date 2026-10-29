import {
  DARK_THEME,
  LIGHT_THEME,
} from "../../constants/preview-list/theme.const";
import type { PreviewListTheme } from "../../components/preview-list/preview-list.types";

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
