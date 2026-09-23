import { useState } from 'react';

import { useRemoteHost } from '../components/remote-host.component';

/**
 * The props a `TextInput` takes so that it works on the device *and* in the React Native DevTools
 * tab.
 *
 * On the device a field is controlled, which is what makes a clear button empty it. Off the device
 * it cannot be: keeping a native view in step is a dispatched command, the tab's ref is a stand-in
 * rather than a native view, and typing into a controlled field there throws.
 * `remote-host.component.tsx` has the whole of why.
 *
 * So off the device the field owns its own text, and a clear remounts it — which is all a `key` that
 * changes does. `onChangeText` still arrives on every keystroke either way, so nothing that reads
 * the value has to know which of the two it got.
 */
export function useRemoteSafeInput(value: string, onChangeText: (next: string) => void) {
  const remote = useRemoteHost();
  const [clears, setClears] = useState(0);

  return {
    /** Spread onto the `TextInput`, beside a `key={resetKey}`. */
    textProps: remote ? { defaultValue: '', onChangeText } : { value, onChangeText },
    /** Changes only when the field is cleared, and only off the device. */
    resetKey: remote ? clears : 0,
    clear: () => {
      onChangeText('');
      if (remote) setClears((count) => count + 1);
    },
  };
}
