import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

import {
  DEFAULT_LABELS,
  LIGHT_THEME,
} from "../../../constants/preview-list/theme.const";
import type { LocalPreview } from "../../../services/previews/local-previews.service";
import type {
  PreviewItem,
  PreviewStatus,
} from "../../../utils/previews/preview-items.util";
import type { IndexEntry } from "../../../utils/previews/layout.util";
import { PreviewRow } from "../preview-row.component";
import { Card } from "../ui/card.ui";
import { Chip } from "../ui/chip.ui";

const PUBLISHED = "2026-10-01T10:00:00.000Z";
const TWO_MINUTES_LATER = Date.parse(PUBLISHED) + 2 * 60_000;

const entry = (patch: Partial<IndexEntry> = {}): IndexEntry => ({
  id: "task-1",
  title: "Login fix",
  branch: "task-1-login",
  commit: "abc1234def",
  author: "Ana",
  publishedAt: PUBLISHED,
  appVersion: "1.0.0",
  buildNumber: "7",
  compatibility: "appVersion",
  fingerprint: "fp",
  revision: "r1",
  size: 1536 * 1024,
  changelog: "",
  manifest: "previews/ios/version-1.0.0/task-1.json",
  ...patch,
});

const LOCAL = { id: "task-1" } as LocalPreview;

const item = (
  status: PreviewStatus,
  patch: Partial<PreviewItem> = {},
  entryPatch: Partial<IndexEntry> = {},
): PreviewItem => ({
  id: "task-1",
  entry: entry(entryPatch),
  status,
  progress: status === "downloading" ? 0.4 : null,
  active: false,
  local: status === "available" || status === "downloading" ? null : LOCAL,
  ...patch,
});

const actions = {
  onDownload: jest.fn(),
  onSwitch: jest.fn(),
  onDelete: jest.fn(),
};

function render(row: PreviewItem): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <PreviewRow
        theme={LIGHT_THEME}
        labels={DEFAULT_LABELS}
        item={row}
        now={TWO_MINUTES_LATER}
        {...actions}
      />,
    );
  });
  return tree;
}

/** A native view by name, not the component that renders it. */
const host = (node: ReactTestInstance, name: string) =>
  (node.type as unknown) === name;

const texts = (node: ReactTestInstance) =>
  node
    .findAll(() => true)
    .flatMap((n) => n.children.filter((c) => typeof c === "string"));

/** The buttons, by what they say, with the host Pressable's props. */
const buttons = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (n) => n.props.accessibilityRole === "button" && !host(n, "View"),
    { deep: false },
  );
const buttonTitles = (tree: ReactTestRenderer) =>
  buttons(tree).map((b) => texts(b)[0]);
const chip = (tree: ReactTestRenderer, text: string) =>
  tree.root.findAllByType(Chip).find((c) => c.props.text === text);

beforeEach(() => jest.clearAllMocks());

test.each([
  ["available", "Not downloaded", "neutral", ["Download"]],
  ["downloading", "Downloading", "primary", []],
  ["downloaded", "Downloaded", "success", ["Delete", "Switch"]],
  ["update-available", "Update available", "warning", ["Delete", "Update"]],
  ["unpublished", "Unpublished", "danger", ["Delete", "Switch"]],
  [
    "broken",
    "Broken: it stopped while starting",
    "danger",
    ["Delete", "Switch"],
  ],
] as const)(
  "%s: a %s chip in %s, and only %j to press",
  (status, text, tone, shown) => {
    const tree = render(item(status));
    expect(chip(tree, text)?.props.tone).toBe(tone);
    expect(buttonTitles(tree)).toEqual(shown);
    expect(tree.root.findByType(Card).props.tinted).toBeFalsy();
  },
);

test("one main action, filled, and a quiet Delete, each 44 high and named for a screen reader", () => {
  const tree = render(item("update-available"));
  const [del, update] = buttons(tree);
  expect(del.props.accessibilityLabel).toBe("Delete, Login fix");
  expect(update.props.accessibilityLabel).toBe("Update, Login fix");
  const style = (b: ReactTestInstance) => b.props.style({ pressed: false });
  expect(style(del)).toMatchObject({ minHeight: 44, borderWidth: 0 });
  expect(style(update)).toMatchObject({
    minHeight: 44,
    backgroundColor: LIGHT_THEME.primary,
  });
  act(() => update.props.onPress());
  expect(actions.onDownload).toHaveBeenCalledWith("task-1");
  act(() => del.props.onPress());
  expect(actions.onDelete).toHaveBeenCalledWith("task-1");
});

test("a download in progress shows its bar", () => {
  const tree = render(item("downloading"));
  const bar = tree.root.find(
    (n) => n.props.accessibilityRole === "progressbar",
  );
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
});

test("the running preview is tinted and says Active instead of Switch", () => {
  const tree = render(item("downloaded", { active: true }));
  expect(tree.root.findByType(Card).props.tinted).toBe(true);
  expect(chip(tree, "Active")?.props.tone).toBe("success");
  // Running means downloaded.
  expect(chip(tree, "Downloaded")).toBeUndefined();
  expect(buttonTitles(tree)).toEqual(["Delete"]);
});

test("the running preview with an update still offers Update", () => {
  const tree = render(item("update-available", { active: true }));
  expect(chip(tree, "Active")).toBeDefined();
  expect(chip(tree, "Update available")).toBeDefined();
  expect(buttonTitles(tree)).toEqual(["Delete", "Update"]);
});

test("the branch is a quote line right under the title, not a chip", () => {
  const tree = render(item("downloaded"));
  const said = texts(tree.root);
  expect(said.slice(said.indexOf("Login fix") + 1).slice(0, 2)).toEqual([
    "Branch: ",
    "task-1-login",
  ]);
  expect(chip(tree, "task-1-login")).toBeUndefined();
  const line = tree.root.find(
    (n) =>
      n.props.accessibilityLabel === "Branch task-1-login" && host(n, "View"),
  );
  // Bar and text share the branch's tone, which is not the muted grey.
  const bar = line.find(
    (n) => n.props.testID === "branch-bar" && host(n, "View"),
  );
  const text = line.findAll((n) => host(n, "Text"))[0];
  expect(bar.props.style.backgroundColor).toBe(text.props.style.color);
  expect(text.props.style.color).not.toBe(LIGHT_THEME.muted);
  expect(text.props.style.fontSize).toBe(13);
});

test("a long branch name with no spaces wraps in full: no line limit, the bar runs its height", () => {
  const name = "feature/very-long-branch-name-without-spaces-".repeat(4);
  const tree = render(item("downloaded", {}, { branch: name }));
  const line = tree.root.find(
    (n) => n.props.accessibilityLabel === `Branch ${name}` && host(n, "View"),
  );
  const [text] = line.findAll((n) => host(n, "Text"));
  expect(text.props.numberOfLines).toBeUndefined();
  expect(text.props.ellipsizeMode).toBeUndefined();
  // Bounded by the row, so a word longer than the line breaks instead of running out of the card.
  expect(text.props.style.flex).toBe(1);
  const bar = line.find(
    (n) => n.props.testID === "branch-bar" && host(n, "View"),
  );
  expect(bar.props.style.alignSelf).toBe("stretch");
  expect(texts(line)).toContain(name);
});

test("a long title wraps to two lines, then an ellipsis, a step below the section headings", () => {
  const tree = render(
    item("downloaded", {}, { title: "A very long title ".repeat(10) }),
  );
  const title = tree.root.find(
    (n) => host(n, "Text") && n.props.numberOfLines === 2,
  );
  expect(title.props.ellipsizeMode).toBe("tail");
  expect(title.props.style.fontSize).toBe(16);
});

test("the environment is a chip when the preview has one, and absent otherwise", () => {
  const withEnv = render(item("downloaded", {}, { environment: "staging" }));
  const env = chip(withEnv, "env: staging");
  expect(env?.props.tone).toBe("accent3");
  expect(env?.props.accessibilityLabel).toBe("Environment staging");
  const without = render(item("downloaded"));
  expect(without.root.findAllByType(Chip).map((c) => c.props.text)).toEqual([
    "Downloaded",
  ]);
});

test("who published it and how long ago, with the full date for a screen reader", () => {
  const tree = render(item("downloaded"));
  expect(texts(tree.root)).toContain("Ana, 2 minutes ago");
  const byline = tree.root.find(
    (n) => host(n, "Text") && n.props.children === "Ana, 2 minutes ago",
  );
  expect(byline.props.accessibilityLabel).toBe(
    `Author: Ana. Published: ${new Date(PUBLISHED).toLocaleString()}`,
  );
  // No middle-dot strings anywhere, and the size on its own.
  expect(texts(tree.root).filter((t) => t.includes(" · "))).toEqual([]);
  expect(texts(tree.root)).toContain("1.5 MB");
});

test("a long changelog shows three lines and opens with Show more", () => {
  const changelog = "- one\n- two\n- three\n- four\n- five";
  const tree = render(item("downloaded", {}, { changelog }));
  const toggle = tree.root.find(
    (n) => n.props.testID === "changelog-toggle" && !host(n, "View"),
  );
  const body = () =>
    tree.root.find((n) => host(n, "Text") && n.props.children === changelog);
  expect(body().props.numberOfLines).toBe(3);
  expect(texts(toggle)).toContain("Show more");
  act(() => toggle.props.onPress());
  expect(body().props.numberOfLines).toBeUndefined();
  expect(texts(toggle)).toContain("Show less");
});

test("a short changelog is shown whole, with nothing to open", () => {
  const tree = render(item("downloaded", {}, { changelog: "Fixed login." }));
  expect(texts(tree.root)).toContain("Fixed login.");
  expect(texts(tree.root)).not.toContain("Show more");
});
