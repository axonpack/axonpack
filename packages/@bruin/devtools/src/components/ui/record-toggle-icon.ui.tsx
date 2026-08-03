import { View } from 'react-native';

/**
 * A rounded circle outline containing a smaller filled shape — the network log's record/pause
 * toggle: a square inside reads as "recording, tap to stop" (the classic tape-deck stop glyph),
 * a circle inside reads as "tap to start". Built from plain Views since MaterialIcons has
 * nothing shaped like this.
 */
export function RecordToggleIcon({
  size = 19,
  color,
  shape,
}: {
  size?: number;
  color: string;
  shape: 'square' | 'circle';
}) {
  const innerSize = Math.round(size * 0.42);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: shape === 'circle' ? innerSize / 2 : Math.round(innerSize * 0.15),
          backgroundColor: color,
        }}
      />
    </View>
  );
}
