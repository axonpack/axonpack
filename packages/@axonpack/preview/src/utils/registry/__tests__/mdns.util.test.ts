import type { RegisteredServer } from "../../../constants/dev-preview-servers/dev-preview-servers.const";
import {
  announcement,
  asksForPreview,
  encodeTxt,
  questionNames,
} from "../mdns.util";
import { readAnswers } from "./read-answers.test-helper";

const machine = { id: "abc", name: "qa-mac", addresses: ["192.168.1.24"] };
const server: RegisteredServer = {
  id: "8081-x",
  port: 8081,
  title: "Login fix",
  branch: "task-1",
  worktree: "/w/task-1",
  slug: "shop",
  name: "Shop",
  compatibility: "appVersion",
  keys: { ios: "version-1.0.0" },
  startedAt: "t",
};
const packet = (ttl: number) =>
  announcement({
    server,
    machine,
    address: "192.168.1.24",
    registryPort: 19150,
    ttl,
  });

test("a TXT record is length-prefixed strings, empty values left out", () => {
  expect([...encodeTxt({ a: "1", b: "" })]).toEqual([3, 97, 61, 49]);
  expect([...encodeTxt({})]).toEqual([0]);
  const long = encodeTxt({ title: "é".repeat(200) });
  expect(long[0]).toBeLessThanOrEqual(255);
  expect(long.length).toBe(long[0] + 1);
});

test("an announcement is an authoritative response with PTR, SRV, TXT and A", () => {
  const bytes = packet(120);
  // Flags: response, authoritative. No questions, four answers.
  expect([...bytes.subarray(0, 12)]).toEqual([
    0, 0, 0x84, 0, 0, 0, 0, 4, 0, 0, 0, 0,
  ]);
  const instance = "preview-abc-8081._axon-preview._tcp.local";
  expect(readAnswers(bytes)).toEqual([
    {
      name: "_axon-preview._tcp.local",
      type: 12,
      flush: false,
      ttl: 120,
      data: instance,
    },
    {
      name: instance,
      type: 33,
      flush: true,
      ttl: 120,
      data: { port: 8081, target: "axonpack-abc.local" },
    },
    {
      name: instance,
      type: 16,
      flush: true,
      ttl: 120,
      data: [
        "title=Login fix",
        "branch=task-1",
        "slug=shop",
        "name=Shop",
        "compatibility=appVersion",
        "ios=version-1.0.0",
        "registry=19150",
        "machineId=abc",
        "machineName=qa-mac",
      ],
    },
    {
      name: "axonpack-abc.local",
      type: 1,
      flush: true,
      ttl: 120,
      data: "192.168.1.24",
    },
  ]);
  // The A record byte for byte, as RFC 1035 lays it out.
  expect([...bytes.subarray(bytes.length - 34)]).toEqual([
    12,
    ...Buffer.from("axonpack-abc"),
    5,
    ...Buffer.from("local"),
    0,
    0,
    1,
    0x80,
    1,
    0,
    0,
    0,
    120,
    0,
    4,
    192,
    168,
    1,
    24,
  ]);
});

test("a goodbye has TTL 0 and keeps the host's address", () => {
  const answers = readAnswers(packet(0));
  expect(answers.map((a) => [a.type, a.ttl])).toEqual([
    [12, 0],
    [33, 0],
    [16, 0],
  ]);
});

/** A query for `names`, where a name starting with `*.` points back at the first one. */
function query(names: string[], flags = 0) {
  const parts = [
    Buffer.from([0, 0, flags >> 8, 0, 0, names.length, 0, 0, 0, 0, 0, 0]),
  ];
  for (const name of names) {
    const [label, pointer] = name.startsWith("*.")
      ? [name.slice(2), true]
      : [name, false];
    for (const part of label.split("."))
      parts.push(Buffer.from([part.length]), Buffer.from(part));
    parts.push(pointer ? Buffer.from([0xc0, 12]) : Buffer.from([0]));
    parts.push(Buffer.from([0, 12, 0, 1]));
  }
  return Buffer.concat(parts);
}

test("reads the names a query asks about, pointers included", () => {
  expect(
    questionNames(query(["_Axon-Preview._tcp.local", "*.preview-abc-8081"])),
  ).toEqual([
    "_axon-preview._tcp.local",
    "preview-abc-8081._axon-preview._tcp.local",
  ]);
});

test("a response, a broken packet and a looping pointer ask nothing", () => {
  expect(questionNames(query(["_axon-preview._tcp.local"], 0x8400))).toEqual(
    [],
  );
  expect(questionNames(Buffer.from([1, 2, 3]))).toEqual([]);
  const loop = Buffer.from([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0xc0, 12]);
  expect(questionNames(loop)).toEqual([]);
});

test("answers for the type, an instance and the host name only", () => {
  const asks = (name: string) => asksForPreview([name], machine);
  expect(asks("_axon-preview._tcp.local")).toBe(true);
  expect(asks("preview-abc-8081._axon-preview._tcp.local")).toBe(true);
  expect(asks("axonpack-abc.local")).toBe(true);
  expect(asks("_expo._tcp.local")).toBe(false);
  expect(asks("axonpack-other.local")).toBe(false);
});
