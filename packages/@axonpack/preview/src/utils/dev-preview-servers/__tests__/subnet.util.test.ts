import { sweepRange } from "../subnet.util";

test("a /24 is every other address from .1 to .254", () => {
  const range = sweepRange({ address: "192.168.1.50", prefixLength: 24 });
  expect(range).toHaveLength(253);
  expect(range[0]).toBe("192.168.1.1");
  expect(range[range.length - 1]).toBe("192.168.1.254");
  expect(range).not.toContain("192.168.1.50");
  expect(range).not.toContain("192.168.1.0");
  expect(range).not.toContain("192.168.1.255");
});

test("a /25 is the half the device is in", () => {
  expect(sweepRange({ address: "10.0.0.200", prefixLength: 25 })).toEqual(
    Array.from({ length: 126 }, (_, i) => `10.0.0.${129 + i}`).filter(
      (a) => a !== "10.0.0.200",
    ),
  );
  expect(sweepRange({ address: "10.0.0.5", prefixLength: 25 })).toHaveLength(
    125,
  );
});

test("longer prefixes give the smaller network", () => {
  expect(sweepRange({ address: "172.16.4.9", prefixLength: 29 })).toEqual([
    "172.16.4.10",
    "172.16.4.11",
    "172.16.4.12",
    "172.16.4.13",
    "172.16.4.14",
  ]);
  expect(sweepRange({ address: "172.16.4.9", prefixLength: 30 })).toEqual([
    "172.16.4.10",
  ]);
  // A /31 has no network or broadcast address, so the other end is the only one.
  expect(sweepRange({ address: "172.16.4.9", prefixLength: 31 })).toEqual([
    "172.16.4.8",
  ]);
  expect(sweepRange({ address: "172.16.4.9", prefixLength: 32 })).toEqual([]);
});

test("a bigger network is cut to the device's own /24", () => {
  const range = sweepRange({ address: "10.20.30.40", prefixLength: 16 });
  expect(range).toHaveLength(253);
  expect(range.every((a) => a.startsWith("10.20.30."))).toBe(true);
});
