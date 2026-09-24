import { createContext, use, type ReactNode } from 'react';

/**
 * Whether this tree is being drawn somewhere other than the device.
 *
 * There is exactly one thing in this package that has to behave differently, and it is not a style:
 * a **controlled** `TextInput` keeps its native view in step by sending it a command, and the React
 * Native DevTools tab has no native view behind it. The ref a field gets there is a stand-in, so the
 * command is dispatched at something that is not a native component and typing throws.
 *
 * So a field asks this, and runs uncontrolled where there is nothing to command. Context rather than
 * a module flag because the two panels are alive at the same time in the same app: the device's own
 * panel must stay controlled while the tab does not.
 *
 * Nothing on the device provides it, so the default is what a device gets, and the mobile panel is
 * unchanged by any of this.
 */
const RemoteHostContext = createContext(false);

export function useRemoteHost(): boolean {
  return use(RemoteHostContext);
}

/** Wrapped around a tree that is drawn off the device. Only the DevTools tab does this. */
export function RemoteHostProvider({ children }: { children: ReactNode }) {
  return <RemoteHostContext value>{children}</RemoteHostContext>;
}
