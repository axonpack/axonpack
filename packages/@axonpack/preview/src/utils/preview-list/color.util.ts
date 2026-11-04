import type { PreviewListTheme } from "../../components/preview-list/preview-list.types";
import type { ChipTone } from "../../components/preview-list/ui/chip.ui";
import { contrastRatio, luminance } from "./theme.util";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** `#rgb`, `#rrggbb` or `#rrggbbaa` as 0 to 255 channels and 0 to 1 alpha; null for anything else. */
function parse(color: string): [number, number, number, number] | null {
  const match = HEX.exec(color.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  const at = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [at(0), at(2), at(4), hex.length === 8 ? at(6) / 255 : 1];
}

const toHex = (channels: number[]) =>
  `#${channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/**
 * The colour at `alpha` (times its own alpha) as `#rrggbbaa`, for a wash of a tone. Null for a
 * colour this can't read, such as `rgb()` or a name, so the caller can draw an outline instead.
 */
export function withAlpha(color: string, alpha: number): string | null {
  const rgba = parse(color);
  if (!rgba) return null;
  const [r, g, b, a] = rgba;
  return toHex([r, g, b, a * alpha * 255]);
}

/** A translucent colour laid over an opaque one, as `#rrggbb`. */
export function over(top: string, under: string): string {
  const t = parse(top);
  const u = parse(under);
  if (!t || !u) return under;
  return toHex([0, 1, 2].map((i) => t[i] * t[3] + u[i] * (1 - t[3])));
}

/**
 * The colour, moved toward black (on light backgrounds) or white (on dark) only as far as it takes
 * to read as small text, 4.5:1, on every one of `backgrounds`. A palette's raw accent often
 * doesn't (solarized's green on its cream), and the tone should still look like itself.
 */
export function readable(color: string, backgrounds: string[]): string {
  const rgba = parse(color);
  if (!rgba) return color;
  const target = luminance(backgrounds[0]) > 0.18 ? 0 : 255;
  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    const mixed = toHex(rgba.slice(0, 3).map((c) => c + (target - c) * t));
    if (backgrounds.every((b) => contrastRatio(mixed, b) >= 4.5)) return mixed;
  }
  return target ? "#ffffff" : "#000000";
}

const TONE_KEY: Record<ChipTone, keyof PreviewListTheme> = {
  primary: "primary",
  neutral: "muted",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  accent2: "accent2",
  accent3: "accent3",
};

/** How strong a chip's wash of its tone is. */
export const TONE_WASH = 0.16;

/**
 * A tone's text colour and its wash. The text is made to read on the wash over a card and over the
 * header's tint, the two places chips sit. `fill` is null when the tone isn't hex.
 */
export function toneColors(
  theme: PreviewListTheme,
  tone: ChipTone,
): { text: string; fill: string | null } {
  const color = theme[TONE_KEY[tone]] as string;
  const fill = withAlpha(color, TONE_WASH);
  const grounds = [theme.card, theme.tint].map((ground) =>
    fill ? over(fill, ground) : ground,
  );
  return { text: readable(color, grounds), fill };
}
