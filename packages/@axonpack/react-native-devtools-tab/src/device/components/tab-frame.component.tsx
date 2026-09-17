import {
  createElement,
  useReducer,
  type ComponentType,
  type ReactNode,
} from "react";

/**
 * The bar above every tab, and the tab's own component under it.
 *
 * Here rather than in each consumer's component: the name is one `registerTab` was already handed,
 * and a way to draw the tab again is the same button every time.
 *
 * Drawing again is a `useReducer` in the app rather than a message from the panel. The component
 * runs here, so re-rendering it is a local matter and what the render changes reaches the panel as
 * ordinary ops. It is also the one thing no hook covers: state a component reads that React is not
 * watching.
 *
 * Styled by class, with the rules in `renderer/renderer.css`, so the bar follows the panel's light
 * and dark instead of carrying colours picked in the app.
 */
const DOCS = "https://axonpack.github.io/docs";
const HOME = "https://axonpack.github.io";

export function TabFrame({
  name,
  component,
}: {
  name: string;
  component: ComponentType;
}): ReactNode {
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  return (
    <>
      <header className="axonpack-tab-bar">
        <span className="axonpack-tab-name">
          {/* The mark is drawn by the class, for the same reason the refresh glyph is. */}
          <span className="axonpack-tab-brand" tabIndex={0}>
            <span className="axonpack-tab-about">
              <b>{name}</b>
              <span>
                This tab is rendered via Axonpack React Native DevTools Tab.
              </span>
              <span className="axonpack-tab-links">
                <a href={DOCS} target="_blank" rel="noreferrer">
                  Learn more
                </a>
                <a href={HOME} target="_blank" rel="noreferrer">
                  All Axonpack libraries
                </a>
              </span>
            </span>
          </span>
          {name}
        </span>
        {/* Empty: the glyph is a mask in `renderer/renderer.css`, since SVG cannot cross. */}
        <button
          onClick={refresh}
          title="Render this tab again"
          aria-label="Render this tab again"
        />
      </header>
      {createElement(component)}
    </>
  );
}
