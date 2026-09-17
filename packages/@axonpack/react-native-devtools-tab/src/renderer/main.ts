import "./renderer.css";
import { startRenderer } from "./start-renderer";

/**
 * The browser entry, and the only file rsbuild is pointed at.
 *
 * Each DevTools tab loads this same page with its own id in the query string, so one build serves
 * however many tabs an app registers.
 */
const tabId = new URLSearchParams(window.location.search).get("tab");

// React owns what is inside it, so the page keeps a container of its own rather than handing over
// `body`, which the error handler above also writes into.
const root = document.getElementById("root");

if (tabId && root) {
  startRenderer(tabId, root);
} else {
  document.body.textContent = "This page needs a ?tab= id.";
}
