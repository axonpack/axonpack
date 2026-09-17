import {
  createElement,
  useEffect,
  useReducer,
  useState,
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
const DOCS = "https://axonpack.github.io/docs";
const HOME = "https://axonpack.github.io";
const REPO = "https://api.github.com/repos/axonpack/axonpack";

/**
 * How long a refresh waits before the tab is drawn again.
 *
 * Deliberate. Re-rendering takes a few milliseconds and the ops reach the panel in a few more, so
 * the loader was up for less than a frame and the button read as doing nothing at all. This is long
 * enough to see that it did.
 */
const RENDER_DELAY = 600;

/**
 * The star count, or null until it arrives and for good if it never does.
 *
 * The request is kept at module level rather than per component: every tab's bar draws this card, so
 * an app with four tabs would otherwise ask GitHub four times for the same number, against a limit
 * of sixty an hour for an unauthenticated caller. It runs in the app, which is where a `fetch` is,
 * and only once a panel has asked for the tab, so an app nobody is debugging never makes it.
 */
let counted: Promise<number | null> | undefined;

function useStars(): number | null {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    counted ??= fetch(REPO)
      .then((response) => response.json())
      .then((repo: { stargazers_count?: number }) =>
        typeof repo.stargazers_count === "number"
          ? repo.stargazers_count
          : null,
      )
      .catch(() => null);

    void counted.then(setStars);
  }, []);

  return stars;
}

export function TabFrame({
  name,
  component,
}: {
  name: string;
  component: ComponentType;
}): ReactNode {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [isLoading, startTransition] = useTransition();
  const stars = useStars();

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
                This tab is rendered via Axonpack React Native DevTools Tab.
              </span>
              <a
                className="axonpack-tab-card"
                href={HOME}
                target="_blank"
                rel="noreferrer"
              >
                <span className="axonpack-tab-card-mark" />
                <b>Axonpack</b>
                <span className="axonpack-tab-card-stars">
                  {stars === null ? "" : `\u2605 ${stars}`}
                </span>
                <span className="axonpack-tab-card-slogan">
                  Free, open source foundation libraries for React Native and
                  Expo.
                </span>
              </a>
              <span className="axonpack-tab-links">
                <a href={DOCS} target="_blank" rel="noreferrer">
                  Learn more
                </a>
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
      {isLoading ? (
        <div className="axonpack-tab-loading">
          <span className="axonpack-tab-loading-glyph" />
        </div>
      ) : (
        createElement(component)
      )}
    </>
  );
}
