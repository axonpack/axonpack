import type { DevPreviewServer } from "../../dev-preview-servers/merge-servers.util";
import type { LocalPreview } from "../../../services/previews/local-previews.service";
import type { PreviewItem } from "../../previews/preview-items.util";
import { buildListItems } from "../list-items.util";

type State = Parameters<typeof buildListItems>[0];

const item = (id: string, active = false) =>
  ({ id, entry: { title: id }, active }) as unknown as PreviewItem;
const server = (port: number) =>
  ({ hostPort: `localhost:${port}`, port }) as DevPreviewServer;
const old = (id: string) => ({ id }) as LocalPreview;

const base: State = {
  showDevServers: false,
  hasSlug: true,
  servers: [],
  devServersError: null,
  devServersScanning: false,
  hosts: [],
  allowCustomHosts: true,
  loading: false,
  buildKey: "version-1.0.0",
  items: [],
  incompatible: [],
};
const shape = (state: Partial<State>) =>
  buildListItems({ ...base, ...state }).map((i) => i.key);

test("nothing at all still says nothing is published", () => {
  expect(shape({})).toEqual(["previews", "hint:empty"]);
  expect(shape({ buildKey: null })).toEqual(["previews", "hint:noBuildKey"]);
});

test("no hint while the first answer is loading", () => {
  expect(shape({ loading: true })).toEqual(["previews"]);
});

test("on the default bundle the previews follow in order", () => {
  expect(shape({ items: [item("a"), item("b")] })).toEqual([
    "previews",
    "preview:a",
    "preview:b",
  ]);
});

test("a running preview is one more preview row", () => {
  const list = buildListItems({ ...base, items: [item("a", true)] });
  expect(list[1]).toMatchObject({ type: "preview", item: { active: true } });
});

test("dev servers come first when on, each keyed by host and port, with the hosts after them", () => {
  expect(
    shape({ showDevServers: true, servers: [server(8081), server(8082)] }),
  ).toEqual([
    "dev-servers",
    "server:localhost:8081",
    "server:localhost:8082",
    "dev-server-hosts",
    "previews",
    "hint:empty",
  ]);
  expect(shape({ showDevServers: true })).toEqual([
    "dev-servers",
    "hint:noDevPreviewServers",
    "dev-server-hosts",
    "previews",
    "hint:empty",
  ]);
  // No slug, no look, so no hosts either.
  expect(shape({ showDevServers: true, hasSlug: false })[1]).toBe(
    "hint:noBuildSlug",
  );
});

test("dev servers off leaves them out even when some were found", () => {
  expect(shape({ servers: [server(8081)] })).toEqual([
    "previews",
    "hint:empty",
  ]);
});

test("incompatible downloads get their header and a row each, last", () => {
  expect(
    shape({ items: [item("a")], incompatible: [old("x"), old("y")] }),
  ).toEqual([
    "previews",
    "preview:a",
    "incompatible",
    "incompatible:x",
    "incompatible:y",
  ]);
});

const grouped = (list: ReturnType<typeof buildListItems>) =>
  list.flatMap((i) =>
    i.type === "dev-server" ||
    i.type === "dev-server-hosts" ||
    i.type === "hint"
      ? [i.position ?? null]
      : [],
  );

test.each([
  [1, ["first", "last"]],
  [2, ["first", "middle", "last"]],
  [3, ["first", "middle", "middle", "last"]],
])("%d dev servers and the hosts are one group: %j", (count, positions) => {
  const servers = Array.from({ length: count }, (_, i) => server(8081 + i));
  const list = buildListItems({ ...base, showDevServers: true, servers });
  // The previews' own hint, after the group, is not in it.
  expect(grouped(list)).toEqual([...positions, null]);
});

test("with no servers, the line saying so is the card's first row, and the hosts its last", () => {
  const list = buildListItems({ ...base, showDevServers: true });
  expect(grouped(list)).toEqual(["first", "last", null]);
  // No slug: the warning stands on its own, as before.
  expect(
    grouped(buildListItems({ ...base, showDevServers: true, hasSlug: false })),
  ).toEqual([null, null]);
});

test("downloads for another build are one group too", () => {
  const list = buildListItems({
    ...base,
    incompatible: [old("x"), old("y"), old("z")],
  });
  expect(
    list.flatMap((i) => (i.type === "incompatible" ? [i.position] : [])),
  ).toEqual(["first", "middle", "last"]);
});

test("the hosts end the servers' card, with whether one can be added", () => {
  const hosts = [
    { host: "localhost", port: 19150, source: "built-in" as const },
  ];
  expect(
    buildListItems({
      ...base,
      showDevServers: true,
      hosts,
      allowCustomHosts: false,
    })[2],
  ).toEqual({
    type: "dev-server-hosts",
    key: "dev-server-hosts",
    hosts,
    allowCustomHosts: false,
    position: "last",
  });
});
