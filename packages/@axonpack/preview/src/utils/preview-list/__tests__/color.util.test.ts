import {
  DARK_THEME,
  LIGHT_THEME,
} from "../../../constants/preview-list/theme.const";
import type { ChipTone } from "../../../components/preview-list/ui/chip.ui";
import type { PreviewListTheme } from "../../../components/preview-list/preview-list.types";
import { over, readable, toneColors, withAlpha } from "../color.util";
import { contrastRatio, resolveTheme } from "../theme.util";
import {
  devtoolsDark,
  devtoolsMonokai,
  devtoolsSolarizedLight,
} from "./devtools-palettes.test-helper";

describe("withAlpha", () => {
  test.each([
    ["#2563eb", 0.5, "#2563eb80"],
    ["#26e", 0.5, "#2266ee80"],
    ["#2563EB", 1, "#2563ebff"],
    // A colour that is already see-through gets more so.
    ["#2563eb80", 0.5, "#2563eb40"],
  ])("%s at %d is %s", (color, alpha, out) => {
    expect(withAlpha(color, alpha)).toBe(out);
  });

  test.each(["rgb(37, 99, 235)", "royalblue", "#2563e", ""])(
    "%j can't be read, so there is no wash",
    (color) => {
      expect(withAlpha(color, 0.16)).toBeNull();
    },
  );
});

test("over lays a wash on a ground", () => {
  expect(over("#00000080", "#ffffff")).toBe("#7f7f7f");
  expect(over("#2563eb00", "#ffffff")).toBe("#ffffff");
  expect(over("#2563ebff", "#ffffff")).toBe("#2563eb");
});

test("readable keeps a colour that already reads, and moves one that doesn't only as far as needed", () => {
  expect(readable("#1d4ed8", ["#ffffff"])).toBe("#1d4ed8");
  const amber = readable("#f9ab00", ["#ffffff"]);
  expect(contrastRatio(amber, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(amber, "#ffffff")).toBeLessThan(6);
  const dim = readable("#3b4252", ["#2e3440"]);
  expect(contrastRatio(dim, "#2e3440")).toBeGreaterThanOrEqual(4.5);
  expect(readable("red", ["#ffffff"])).toBe("red");
});

test("a tone that isn't hex is drawn as an outline in that colour", () => {
  const theme = { ...LIGHT_THEME, accent2: "rgb(124, 58, 237)" };
  expect(toneColors(theme, "accent2")).toEqual({
    text: "rgb(124, 58, 237)",
    fill: null,
  });
});

const TONES: ChipTone[] = [
  "primary",
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
  "accent2",
  "accent3",
];

describe.each([
  ["light", LIGHT_THEME],
  ["dark", DARK_THEME],
  ["expo-devtools dark", resolveTheme(devtoolsDark, null)],
  ["expo-devtools solarized-light", resolveTheme(devtoolsSolarizedLight, null)],
  ["expo-devtools monokai", resolveTheme(devtoolsMonokai, null)],
] as [string, PreviewListTheme][])("the %s theme", (_, theme) => {
  test.each(TONES)(
    "%s chip text reads on its wash, over a card and over the header's tint",
    (tone) => {
      const { text, fill } = toneColors(theme, tone);
      for (const ground of [theme.card, theme.tint]) {
        expect(contrastRatio(text, ground)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(text, over(fill as string, ground)),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
