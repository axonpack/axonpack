import type { ComponentType, ReactNode } from 'react';

/**
 * `any` is load-bearing here: RN's `StyleProp<ViewStyle>` and React's `CSSProperties` are not
 * assignable to each other in either direction, so a single concrete style type would reject one
 * platform's `View` outright. The style objects this package builds stay inside the subset both
 * accept — longhand properties only, no `paddingVertical`/`marginHorizontal`.
 */
type Style = any;

export type Primitives = {
  View: ComponentType<{ style?: Style; children?: ReactNode }>;
  /**
   * `selectable` is here for react-native only, where text is unselectable by default and a code
   * block you cannot copy out of is useless. The DOM selects text natively, so `domPrimitives`
   * drops the prop rather than forwarding an unknown attribute to the span.
   */
  Text: ComponentType<{ style?: Style; children?: ReactNode; selectable?: boolean }>;
  /**
   * The long-press event is `unknown` and passed through untouched rather than normalised: only
   * the consumer positions the menu, and only it knows whether to read `pageX` or
   * `nativeEvent.pageX`. `unknown` is also the only parameter type react-native's own `Pressable`
   * is assignable to — anything narrower (`never` included) fails contravariance and forces every
   * RN consumer to write a wrapper.
   */
  Pressable: ComponentType<{
    style?: Style;
    children?: ReactNode;
    onPress?: () => void;
    onLongPress?: (event: unknown) => void;
  }>;
};

/** DOM equivalents, since `onPress`/`onLongPress` don't exist there. RN consumers need no adapter. */
export const domPrimitives: Primitives = {
  View: ({ style, children }) => <div style={style}>{children}</div>,
  Text: ({ style, children }) => <span style={style}>{children}</span>,
  Pressable: ({ style, children, onPress, onLongPress }) => (
    <div
      style={style}
      onClick={onPress}
      onContextMenu={(event) => {
        if (!onLongPress) return;
        // Without this the browser's own menu covers the one the consumer is about to open.
        event.preventDefault();
        onLongPress(event);
      }}>
      {children}
    </div>
  ),
};
