import { useMemo } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedKeyboard } from '../../services/use-animated-keyboard.service';

export type InsetEdge = 'top' | 'bottom' | 'left' | 'right';

const EDGE_PADDING_PROP: Record<InsetEdge, keyof ViewStyle> = {
  top: 'paddingTop',
  bottom: 'paddingBottom',
  left: 'paddingLeft',
  right: 'paddingRight',
};

export function InsetPadding({
  edge,
  avoidKeyboard,
}: {
  edge: InsetEdge;
  /** Grows the padding by whatever the keyboard covers, for an edge it would otherwise sit under. */
  avoidKeyboard?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  // A fresh `Animated.add` every render is a fresh node for the view to attach and detach, so it is
  // built once per thing it depends on instead.
  const padding = useMemo(() => {
    if (!avoidKeyboard) return insets[edge];
    // Not inset + keyboard: an open keyboard covers the home indicator, so the inset it stands in
    // for is already accounted for. Fading the inset out as the keyboard arrives is what keeps this
    // from being a `max()` the Animated API has no operator for.
    const uncovered = Animated.multiply(insets[edge], Animated.subtract(1, keyboard.visible));
    return Animated.add(keyboard.height, uncovered);
  }, [avoidKeyboard, edge, insets, keyboard]);

  return <Animated.View style={[{ [EDGE_PADDING_PROP[edge]]: padding }]} />;
}
