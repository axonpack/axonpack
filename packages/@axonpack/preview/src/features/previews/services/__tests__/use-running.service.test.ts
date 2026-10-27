import type { DevPreviewServer } from "../../../dev-preview-servers/services/discover.service";
import type { PreviewItem } from "../../utils/preview-items.util";
import { runningNow } from "../use-running.service";

const item = (id: string, title: string, active: boolean) =>
  ({ id, entry: { title }, active }) as unknown as PreviewItem;
const server = {
  url: "http://10.0.2.2:8082/index.bundle?platform=android",
  hostPort: "10.0.2.2:8082",
  title: "Task 2",
  branch: "task-2",
} as DevPreviewServer;

test("nothing picked is the base bundle", () => {
  expect(
    runningNow({ items: [], activeId: null, localUrl: null, servers: [] }),
  ).toEqual({ kind: "base" });
});

test("a picked preview gives its title and id", () => {
  expect(
    runningNow({
      items: [item("task-1", "Task 1 login fix", true)],
      activeId: "task-1",
      localUrl: null,
      servers: [],
    }),
  ).toEqual({ kind: "preview", id: "task-1", title: "Task 1 login fix" });
});

test("a preview the list no longer has falls back to its id", () => {
  expect(
    runningNow({ items: [], activeId: "gone", localUrl: null, servers: [] }),
  ).toEqual({ kind: "preview", id: "gone", title: "gone" });
});

test("a dev preview server wins over a picked preview", () => {
  expect(
    runningNow({
      items: [item("task-1", "Task 1", true)],
      activeId: "task-1",
      localUrl: server.url,
      servers: [server],
    }),
  ).toEqual({
    kind: "local",
    url: server.url,
    hostPort: "10.0.2.2:8082",
    server,
  });
});

test("a dev preview server not found yet still gives its host and port", () => {
  expect(
    runningNow({
      items: [],
      activeId: null,
      localUrl: "http://localhost:8083/index.bundle?platform=ios",
      servers: [],
    }),
  ).toEqual({
    kind: "local",
    url: "http://localhost:8083/index.bundle?platform=ios",
    hostPort: "localhost:8083",
    server: null,
  });
});
