import { useEffect } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

export type AnimatedKeyboard = {
  /**
   * How much of the screen the keyboard covers, in dp. Drive a layout prop with it — a padding, a
   * height, an offset — and the view sizes itself against the keyboard without re-rendering.
   */
  height: Animated.Value;
  /**
   * `0` while the keyboard is down and `1` once it covers anything, for a view that switches on the
   * keyboard rather than moving with it. Multiply against it instead of branching in JSX: nothing
   * here re-renders when the keyboard opens, so there is no boolean to branch on.
   */
  visible: Animated.AnimatedInterpolation<number>;
};

/**
 * One value for the whole app rather than one per hook call: there is only one keyboard, and the
 * panel mounts a dozen views that lay out against it — a `Animated.Value` and a pair of listeners
 * each would be a dozen copies of the same number.
 */
const height = new Animated.Value(0);
const keyboard: AnimatedKeyboard = {
  height,
  visible: height.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
};

let watchers = 0;
let subscriptions: { remove(): void }[] = [];

function attach() {
  // A view can mount with the keyboard already up, and then no event is coming.
  height.setValue(Keyboard.metrics()?.height ?? 0);

  // iOS is asked before the keyboard moves and Android after it has: the `will` events do not fire
  // there, so listening for those everywhere would leave Android reading 0 with a keyboard on screen.
  //
  // Set, not timed: a view sized against this has to be the right size *before* the keyboard
  // arrives, and animating the change is what makes it overshoot its bounds on the way there.
  subscriptions = [
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      height.setValue(event.endCoordinates.height)
    ),
    Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      height.setValue(0)
    ),
  ];
}

/**
 * The keyboard as something to lay out against, entirely as animated values — the whole point being
 * that a keyboard opening moves views without re-rendering the tree it opened over.
 *
 * The JS driver is not a choice here: the native one cannot touch layout props, which is all a
 * keyboard height is ever used for. Mixing these into a view that also animates natively is what
 * makes it reject `maxHeight` and `paddingBottom` at runtime.
 */
export function useAnimatedKeyboard(): AnimatedKeyboard {
  useEffect(() => {
    if (watchers++ === 0) attach();
    return () => {
      if (--watchers > 0) return;
      for (const subscription of subscriptions) subscription.remove();
      subscriptions = [];
    };
  }, []);

  return keyboard;
}
