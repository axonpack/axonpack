import {
  DARK_THEME,
  LIGHT_THEME,
} from "../../../constants/preview-list/theme.const";
import type { PreviewListTheme } from "../../../components/preview-list/preview-list.types";
import {
  contrastRatio,
  fromDevtoolsPalette,
  resolveTheme,
} from "../theme.util";

// Shaped like expo-devtools' Palette; the values are made up for the test.
const devtoolsDark = {
  background: "#101418",
  toolbarBackground: "#0b0e11",
  surface: "#1a2027",
  sectionTint: "#222a33",
  border: "#2c3540",
  textPrimary: "#e6edf3",
  textSecondary: "#9aa7b4",
  accent: "#ffcc00",
  keyAccent: "#88c0d0",
  success: "#3fb950",
  error: "#f85149",
  warning: "#d29922",
  errorSurface: "#3b1d1d",
  warningSurface: "#3a2e12",
};

test("no theme follows the device", () => {
  expect(resolveTheme(undefined, "light")).toEqual(LIGHT_THEME);
  expect(resolveTheme(undefined, "dark")).toEqual(DARK_THEME);
  expect(resolveTheme(undefined, null)).toEqual(LIGHT_THEME);
});

test("a partial theme goes over the base its mode picks", () => {
  const theme = resolveTheme(
    { mode: "dark", primary: "#ff0000", fonts: { bold: "Inter-Bold" } },
    "light",
  );
  expect(theme).toMatchObject({
    ...DARK_THEME,
    mode: "dark",
    primary: "#ff0000",
    fonts: { bold: "Inter-Bold" },
  });
});

test("an expo-devtools palette is mapped token by token", () => {
  expect(fromDevtoolsPalette(devtoolsDark)).toEqual({
    mode: "dark",
    background: "#101418",
    card: "#1a2027",
    surface: "#222a33",
    tint: "#222a33",
    tintBorder: "#2c3540",
    border: "#2c3540",
    title: "#e6edf3",
    text: "#e6edf3",
    muted: "#9aa7b4",
    primary: "#ffcc00",
    // Black reads better than white on a yellow accent.
    primaryText: "#000000",
    danger: "#f85149",
    warning: "#d29922",
    success: "#3fb950",
  });
});

test("a light palette with no sectionTint still maps, and white text goes on a dark accent", () => {
  const { sectionTint: _, ...light } = {
    ...devtoolsDark,
    background: "#ffffff",
    surface: "#f6f8fa",
    textPrimary: "#1f2328",
    accent: "#0969da",
  };
  expect(fromDevtoolsPalette(light)).toMatchObject({
    mode: "light",
    surface: "#f6f8fa",
    primaryText: "#ffffff",
  });
});

test("passing the palette as the theme gives the full mapped theme", () => {
  const theme = resolveTheme(devtoolsDark, "light");
  expect(theme.card).toBe("#1a2027");
  expect(theme.radius).toBe(DARK_THEME.radius);
  expect(theme.fonts).toEqual({});
});

test.each([
  ["light", LIGHT_THEME],
  ["dark", DARK_THEME],
] as [string, PreviewListTheme][])(
  "the %s theme's text reads on its cards",
  (_, theme) => {
    for (const back of [theme.card, theme.tint]) {
      expect(contrastRatio(theme.title, back)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.text, back)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.muted, back)).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrastRatio(theme.primaryText, theme.primary),
    ).toBeGreaterThanOrEqual(4.5);
    // The tinted card's edge shows at least as well as a plain card's.
    expect(contrastRatio(theme.tintBorder, theme.tint)).toBeGreaterThanOrEqual(
      contrastRatio(theme.border, theme.card),
    );
  },
);
