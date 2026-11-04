import type { ReactNode } from "react";
import { ScrollView } from "react-native";

// What every card pads its content by. The row runs out to the card's edges, so chips scroll all
// the way across, and pads back in by the same amount, so the first chip starts under the text.
const CARD_PADDING = 16;

/**
 * Chips on one line, scrolling sideways when they don't fit, instead of wrapping onto more lines.
 * Only sideways drags scroll it, so the list still scrolls up and down, and a tap still reaches
 * the row it sits in.
 */
export function ChipRow(props: {
  children: ReactNode;
  /**
   * How far the row runs past its column on the right. The card's padding by default; 0 beside a
   * chevron, which the chips must not slide under.
   */
  endBleed?: number;
}) {
  const end = props.endBleed ?? CARD_PADDING;
  return (
    <ScrollView
      testID="chip-row"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, marginLeft: -CARD_PADDING, marginRight: -end }}
      contentContainerStyle={{
        gap: 6,
        paddingLeft: CARD_PADDING,
        paddingRight: end,
      }}
    >
      {props.children}
    </ScrollView>
  );
}
