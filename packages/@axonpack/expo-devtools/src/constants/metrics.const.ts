/**
 * Touch target sizes, in dp.
 *
 * The panel's type and glyph scale was tuned on a simulator, where a dp reads far larger than it does
 * on a phone held at arm's length — so most controls ended up between 18 and 27dp, well under the
 * platform floors (iOS HIG 44pt, Material 48dp). These are the sizes the primitives enforce so that
 * doesn't drift back.
 *
 * Sizes here are the *touch* box, not the visual one. A 19dp glyph inside a 44dp box still looks the
 * same; it just stops being a coin toss to hit.
 *
 * `hitSlop` alone can't do this job: on Android a child's slop is clipped by its parent's bounds, so
 * slop that reaches past a row's own padding is simply never delivered. It's a top-up here, never the
 * whole target.
 */
export const TOUCH_TARGET = {
  /** The floor for a discrete control — an icon button, a chip, a tab, a menu item. */
  min: 44,
  /**
   * The narrow axis of a toolbar button. The Network toolbar packs seven of them plus dividers; at 44
   * wide that overflows a 360dp screen, so width gives way and height carries the target.
   */
  compact: 36,
  /**
   * A full-width row — a section header, a settings row. Width is effectively unbounded there, so the
   * height alone doesn't need to reach 44 to be comfortable to hit.
   */
  row: 40,
  /**
   * A control or row inside a dense list (a JSON tree line, a console row's meta strip), where a 44dp
   * floor would add its difference to *every* row and cost more in scrolling than it returns in
   * accuracy. Always paired with `HIT_SLOP.dense`.
   */
  dense: 28,
} as const;

export const HIT_SLOP = {
  default: 8,
  /** Larger, because it's topping up a `TOUCH_TARGET.dense` box rather than a full-size one. */
  dense: 10,
} as const;
