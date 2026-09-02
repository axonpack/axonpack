/**
 * Whether a palette colour reads as dark, used to pick status bar content that stays legible over
 * it. Perceived brightness (BT.601 luma) rather than a linear average: the eye weights green far
 * above blue, and `#0000ff` is dark while `#00ff00` is not.
 *
 * An alpha suffix is ignored — a translucent colour is composited over something this cannot see,
 * and its own RGB is the best guess available. Anything unparseable answers `false`, so an unknown
 * format leaves the status bar on its light-background default rather than inverting it.
 */
export function isDarkColor(color: string): boolean {
  const hex = color.trim().replace(/^#/, '');
  const rgb =
    hex.length === 3 || hex.length === 4
      ? Array.from(hex.slice(0, 3), (channel) => channel + channel).join('')
      : hex.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(rgb)) return false;

  const value = Number.parseInt(rgb, 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return 0.299 * red + 0.587 * green + 0.114 * blue < 128;
}
