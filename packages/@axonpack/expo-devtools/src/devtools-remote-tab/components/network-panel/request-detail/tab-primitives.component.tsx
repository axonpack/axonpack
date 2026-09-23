import { domPrimitives, type Primitives } from '@axonpack/react-pretty-print';
import { createContext, useContext, useId, type ReactNode } from 'react';

/** The row a right-click was on, and the menu to draw under it. */
export const MenuSlot = createContext<{
  openId: string | null;
  open: (id: string) => void;
  menu: ReactNode;
}>({ openId: null, open: () => {}, menu: null });

/**
 * A tree row's style at a mouse's density. The package sizes a row as a finger's target (a 28px
 * floor and 4px above and below), and on a `div` the padding adds to that floor rather than sitting
 * inside it, so a row came out 36px tall around 12px of text.
 */
function dense(style?: { minHeight?: number }) {
  if (style?.minHeight === undefined) return style;
  return { ...style, minHeight: undefined, paddingTop: 1, paddingBottom: 1 };
}

function TabView({ style, children }: { style?: object; children?: ReactNode }) {
  return <div style={dense(style)}>{children}</div>;
}

/**
 * The pretty printer's DOM primitives, rows at a mouse's density, with a `Pressable` that knows
 * which row was right-clicked.
 *
 * The package hands the menu's items back with the event and leaves placing it to the caller, but an
 * event reaching the app from the tab carries no pointer position. So each row says it was the one,
 * and the menu is drawn under it. Beside the row rather than inside it, since a click in the menu
 * would reach the row's own toggle too.
 *
 * It asks for right-clicks only on a row that has a menu. The tab page cancels the browser's own
 * menu wherever one is asked for, which the package's own primitives do on every row.
 */
function TabPressable({
  style,
  children,
  onPress,
  onLongPress,
}: {
  style?: object;
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: (event: unknown) => void;
}) {
  const id = useId();
  const slot = useContext(MenuSlot);

  return (
    <>
      <div
        style={dense(style)}
        onClick={onPress}
        onContextMenu={
          onLongPress &&
          ((event) => {
            slot.open(id);
            onLongPress(event);
          })
        }>
        {children}
      </div>
      {slot.openId === id && <div className="axonpack-net-context-anchor">{slot.menu}</div>}
    </>
  );
}

export const TAB_PRIMITIVES: Primitives = {
  ...domPrimitives,
  View: TabView,
  Pressable: TabPressable,
};
