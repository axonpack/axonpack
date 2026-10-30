import { File } from "expo-file-system";

import { readHosts, saveHosts } from "../hosts.service";
import { rootDirectory } from "../../previews/local-previews.service";

jest.mock("expo-file-system", () =>
  require("../../previews/__tests__/fake-file-system.test-helper"),
);

const file = () => new File(rootDirectory(), "hosts.json");

beforeEach(() => file().delete());

test("no file is no hosts", async () => {
  expect(await readHosts()).toEqual([]);
});

test("hosts are saved in Documents/preview/hosts.json as typed, and read back", async () => {
  const hosts = [
    { host: "192.168.1.30", port: 19150 },
    { host: "qa-mac.local", port: 19151 },
  ];
  await saveHosts(hosts);
  expect(file().uri).toMatch(/\/docs\/preview\/hosts\.json$/);
  expect(JSON.parse(await file().text())).toEqual([
    "192.168.1.30",
    "qa-mac.local:19151",
  ]);
  expect(await readHosts()).toEqual(hosts);
});

test("a broken file, or an entry that is not a host, is left out", async () => {
  await file().write("{not json");
  expect(await readHosts()).toEqual([]);
  await file().write(JSON.stringify(["192.168.1.30", "no such host!", 7]));
  expect(await readHosts()).toEqual([{ host: "192.168.1.30", port: 19150 }]);
});
