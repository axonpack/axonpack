import { StyleSheet, View } from 'react-native';

import { ErrorArgCell } from './error-arg-cell.component';
import { TextArgCell } from './text-arg-cell.component';
import type { ConsoleArg } from '../../utils/console/format-console-args.util';
import { JsonTree } from '../json-tree';

/** One `console.*` argument. Objects and arrays get the same inspectable tree the Network tab uses. */
export function ConsoleArgCell({ arg, plainColor }: { arg: ConsoleArg; plainColor?: string }) {
  if (arg.kind === 'error') return <ErrorArgCell text={arg.text} stack={arg.stack} />;

  // Collapsed to a one-line `{…}` preview so it sits inline beside the arguments around it, the way
  // a browser console lays a row out. The type name rides on that same root line (`Map(2): {…}`)
  // rather than a caption above it, so an argument needs no box of its own.
  if (arg.kind === 'json') {
    // Wrapped only to make the tree shrinkable inside the row's wrap container — no visual chrome.
    return (
      <View style={styles.shrinkable}>
        <JsonTree value={arg.value} rootLabel={arg.label} defaultExpanded={false} />
      </View>
    );
  }

  return <TextArgCell text={arg.text} tone={arg.tone} plainColor={plainColor} />;
}

const styles = StyleSheet.create({
  shrinkable: {
    flexShrink: 1,
  },
});
