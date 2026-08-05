import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { COLORS } from '../../constants/colors.const';

const PULSE_MS = 700;

/** A small looping pulse — flags a menu item as novel/featured without needing a "New" badge. */
export function SparkleIcon({ size = 16 }: { size?: number }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <MaterialIcons name="auto-awesome" size={size} color={COLORS.warning} />
    </Animated.View>
  );
}
