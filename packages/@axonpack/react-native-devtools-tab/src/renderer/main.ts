import "./renderer.css";
import { startRenderer } from "./start-renderer";

/**
 * The browser entry, and the only file rsbuild is pointed at.
 *
 * Each DevTools tab loads this same page with its own id in the query string, so one build serves
 * however many tabs an app registers.
 */
const tabId = new URLSearchParams(window.location.search).get("tab");

if (tabId) {
  startRenderer(tabId);
} else {
  document.body.textContent = "This page needs a ?tab= id.";
}
