import { act, create, type ReactTestRenderer } from "react-test-renderer";

import {
  DEFAULT_LABELS,
  LIGHT_THEME,
} from "../../../constants/preview-list/theme.const";
import type { DevPreviewServer } from "../../../utils/dev-preview-servers/merge-servers.util";
import { DevServerRow } from "../dev-server-row.component";
import { Chip } from "../ui/chip.ui";

const bonjourServer: DevPreviewServer = {
  hostPort: "192.168.1.178:8083",
  host: "192.168.1.178",
  port: 8083,
  url: "http://192.168.1.178:8083/index.bundle?platform=ios",
  title: "Signup",
  name: "Shop",
  slug: "shop",
  version: "1.0.0",
  branch: "task-2",
  worktree: null,
  key: "version-1.0.0",
  compatible: true,
  announced: true,
  machine: "Bonjour test Mac",
};

async function render(server: DevPreviewServer) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <DevServerRow
        theme={LIGHT_THEME}
        labels={DEFAULT_LABELS}
        server={server}
        active={false}
        offline={false}
        isDefault={false}
        position="only"
        onSwitch={() => undefined}
      />,
    );
  });
  return tree;
}

const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAll(() => true)
    .flatMap((node) =>
      node.children.filter((child) => typeof child === "string"),
    ) as string[];

test("a server Bonjour found shows its IP address, and its computer's name in a plain chip", async () => {
  const tree = await render(bonjourServer);
  expect(texts(tree)).toContain("192.168.1.178:8083");
  expect(texts(tree)).not.toContain("Bonjour test Mac:8083");
  const chip = tree.root
    .findAllByType(Chip)
    .find((c) => c.props.text === "Bonjour test Mac");
  expect(chip?.props.tone).toBeUndefined();
  expect(
    tree.root.findByProps({ accessibilityRole: "button" }).props,
  ).toMatchObject({
    accessibilityLabel: expect.stringContaining(
      "Switch to Signup, 192.168.1.178:8083",
    ),
  });
});

test("a server found any other way has no computer chip", async () => {
  const { machine: _, ...typed } = bonjourServer;
  const tree = await render(typed);
  expect(tree.root.findAllByType(Chip).map((c) => c.props.text)).not.toContain(
    "Bonjour test Mac",
  );
});
