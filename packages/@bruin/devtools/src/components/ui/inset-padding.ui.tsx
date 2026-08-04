import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type InsetEdge = 'top' | 'bottom' | 'left' | 'right';

const EDGE_PADDING_PROP: Record<InsetEdge, keyof ViewStyle> = {
  top: 'paddingTop',
  bottom: 'paddingBottom',
  left: 'paddingLeft',
  right: 'paddingRight',
};

export function InsetPadding({
  edge,
  style,
  children,
}: {
  edge: InsetEdge;
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return <View style={[{ [EDGE_PADDING_PROP[edge]]: insets[edge] }, style]}>{children}</View>;
}
