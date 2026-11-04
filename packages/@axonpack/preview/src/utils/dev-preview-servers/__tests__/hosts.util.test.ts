import {
  type DevServerHost,
  checkNewHost,
  formatHost,
  parseHost,
} from "../hosts.util";

test("an IP address or a host name, on the registry's port unless one is given", () => {
  expect(parseHost("192.168.1.24")).toEqual({
    host: "192.168.1.24",
    port: 19150,
  });
  expect(parseHost(" QA-Mac.local:19151 ")).toEqual({
    host: "qa-mac.local",
    port: 19151,
  });
  expect(parseHost("build-box")).toEqual({ host: "build-box", port: 19150 });
  // Pasted from a browser.
  expect(parseHost("http://192.168.1.24:19150/")).toEqual({
    host: "192.168.1.24",
    port: 19150,
  });
});

test("anything else is not a host", () => {
  for (const text of [
    "",
    "   ",
    "192.168.1",
    "192.168.1.256",
    "1.2.3.4.5",
    "qa mac.local",
    "qa_mac.local",
    "-qa.local",
    "qa.local:0",
    "qa.local:70000",
    "qa.local:",
    "https://qa.local",
    "qa.local/servers",
    "::1",
  ])
    expect(parseHost(text)).toBeNull();
});

test("a host reads with its port only when that is not 19150", () => {
  expect(formatHost({ host: "192.168.1.24", port: 19150 })).toBe(
    "192.168.1.24",
  );
  expect(formatHost({ host: "qa-mac.local", port: 19151 })).toBe(
    "qa-mac.local:19151",
  );
});

describe("adding a host", () => {
  const taken: DevServerHost[] = [
    { host: "localhost", port: 19150, source: "built-in" },
    { host: "192.168.1.10", port: 19150, source: "built-in" },
    { host: "qa-mac.local", port: 19150, source: "app" },
    { host: "192.168.1.30", port: 19150, source: "user" },
  ];

  test("a new one is its address", () => {
    expect(checkNewHost("192.168.1.31", taken)).toEqual({
      host: "192.168.1.31",
      port: 19150,
    });
    // Another registry on a listed computer is another host.
    expect(checkNewHost("qa-mac.local:19151", taken)).toEqual({
      host: "qa-mac.local",
      port: 19151,
    });
  });

  test("one already listed is a duplicate, the default port written out or not", () => {
    expect(checkNewHost("192.168.1.30", taken)).toBe("duplicate");
    expect(checkNewHost("QA-MAC.local:19150", taken)).toBe("duplicate");
  });

  test("this computer, under any name or port, is always checked", () => {
    for (const text of [
      "localhost",
      "127.0.0.1:19151",
      "10.0.2.2",
      "192.168.1.10",
    ])
      expect(checkNewHost(text, taken)).toBe("builtIn");
  });

  test("text that is not a host says so", () => {
    expect(checkNewHost("not a host", taken)).toBe("invalid");
  });
});
