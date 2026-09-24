import {
  createElement,
  useReducer,
  useTransition,
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
const HOME = "https://axonpack.github.io";
const GUIDE = "https://axonpack.github.io/docs/react-native-devtools-tab";

const LINKS = [
  { label: "Read the docs", href: GUIDE },
  { label: "Changelog", href: `${GUIDE}/changelog` },
  { label: "Other libraries", href: "https://axonpack.github.io/docs" },
  { label: "GitHub", href: "https://github.com/axonpack/axonpack" },
];

/**
 * How long a refresh waits before the tab is drawn again.
 *
 * Deliberate. Re-rendering takes a few milliseconds and the ops reach the panel in a few more, so
 * the loader was up for less than a frame and the button read as doing nothing at all. This is long
 * enough to see that it did.
 */
const RENDER_DELAY = 600;

export function TabFrame({
  name,
  component,
}: {
  name: string;
  component: ComponentType;
}): ReactNode {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [isLoading, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, RENDER_DELAY));
      refresh();
    });
  };

  return (
    <>
      <header className="axonpack-tab-bar">
        <span className="axonpack-tab-name">
          {/* The mark is drawn by the class, for the same reason the refresh glyph is. */}
          <span className="axonpack-tab-brand" tabIndex={0}>
            <span className="axonpack-tab-about">
              <b>{name}</b>
              <span>
                Drawn by your app, not by DevTools. It runs inside the app, so
                what it shows is the app&apos;s live state.
              </span>
              <a
                className="axonpack-tab-card"
                href={HOME}
                target="_blank"
                rel="noreferrer"
              >
                <span className="axonpack-tab-card-mark" />
                <b>Axonpack</b>
                <span className="axonpack-tab-card-slogan">
                  Free, open source libraries for React Native and Expo.
                </span>
              </a>
              <span className="axonpack-tab-links">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                ))}
              </span>
            </span>
          </span>
          {name}
        </span>
        {/* Empty: the glyph is a mask in `renderer/renderer.css`, since SVG cannot cross. */}
        <button
          onClick={handleRefresh}
          title="Render this tab again"
          aria-label="Render this tab again"
        />
      </header>
      <div className="axonpack-tab-body">
        {isLoading ? (
          <div className="axonpack-tab-loading">
            <span className="axonpack-tab-loading-glyph" />
          </div>
        ) : (
          createElement(component)
        )}
      </div>
    </>
  );
}
