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

test("dev servers come first when on, each keyed by host and port", () => {
  expect(
    shape({ showDevServers: true, servers: [server(8081), server(8082)] }),
  ).toEqual([
    "dev-servers",
    "server:localhost:8081",
    "server:localhost:8082",
    "previews",
    "hint:empty",
  ]);
  expect(shape({ showDevServers: true })).toEqual([
    "dev-servers",
    "hint:noDevPreviewServers",
    "previews",
    "hint:empty",
  ]);
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

test.each([
  [1, ["only"]],
  [2, ["first", "last"]],
  [3, ["first", "middle", "last"]],
])("%d dev servers are one group: %j", (count, positions) => {
  const servers = Array.from({ length: count }, (_, i) => server(8081 + i));
  const list = buildListItems({ ...base, showDevServers: true, servers });
  expect(
    list.flatMap((i) => (i.type === "dev-server" ? [i.position] : [])),
  ).toEqual(positions);
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
