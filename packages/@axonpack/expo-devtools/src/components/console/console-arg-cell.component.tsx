import { StyleSheet, View } from 'react-native';

import { ErrorArgCell } from './error-arg-cell.component';
import { TextArgCell } from './text-arg-cell.component';
import type { ConsoleArg } from '../../utils/console/format-console-args.util';
import { JsonTree } from '../json-tree';

// Narrower than this and an inline object preview isn't worth reading — it wraps to its own line.
const MIN_INLINE_TREE_WIDTH = 180;

/** One `console.*` argument. Objects and arrays get the same inspectable tree the Network tab uses. */
export function ConsoleArgCell({ arg, plainColor }: { arg: ConsoleArg; plainColor?: string }) {
  if (arg.kind === 'error') return <ErrorArgCell text={arg.text} stack={arg.stack} />;

  // Collapsed to a one-line `{…}` preview so it sits inline beside the arguments around it, the way
  // a browser console lays a row out. The type name rides on that same root line (`Map(2): {…}`)
  // rather than a caption above it, so an argument needs no box of its own.
  if (arg.kind === 'json') {
    // Wrapped only to give the tree a sane width inside the row's wrap container — no visual chrome.
    return (
      <View style={styles.tree}>
        <JsonTree value={arg.value} rootLabel={arg.label} defaultExpanded={false} />
      </View>
    );
  }

  return <TextArgCell text={arg.text} tone={arg.tone} plainColor={plainColor} />;
}

const styles = StyleSheet.create({
  /**
   * `flexBasis` is the load-bearing part. A tree's own row is `toggle (14px) + text`, and that text
   * is `flex: 1` — i.e. `flex-basis: 0` — so the tree reports an intrinsic width of ~14px. Sized by
   * content inside the row's wrap container it therefore always "fits", never wraps, and gets
   * squeezed to a few pixels, which is what renders a preview one character per line. Declaring a
   * real basis makes the tree wrap to its own line when the remainder of the current line is too
   * narrow, and `flexGrow` lets it take the full width once it gets there.
   */
  tree: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: MIN_INLINE_TREE_WIDTH,
  },
});
