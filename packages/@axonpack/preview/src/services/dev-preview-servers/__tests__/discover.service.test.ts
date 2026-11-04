import { findRegistries } from "../discover.service";

const answer = (body: unknown) => ({ json: async () => body }) as Response;
const refused = () => Promise.reject(new TypeError("Network request failed"));
/** A host that never answers, until the request is aborted. */
const silent = (init?: RequestInit) =>
  new Promise<Response>((_, reject) =>
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
  );

let asked: string[] = [];
let respond: (host: string, init?: RequestInit) => Promise<Response>;
global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  asked.push(url);
  return respond(/^http:\/\/([^/:]+):/.exec(url)![1], init);
}) as typeof fetch;

beforeEach(() => {
  asked = [];
});

afterEach(() => jest.useRealTimers());

test("only the addresses that answer like a registry are passed on, in the order given", async () => {
  respond = async (host) => {
    if (host === "10.0.0.3") return answer({ servers: [] });
    if (host === "10.0.0.7") return answer({ servers: [], machineId: "qa" });
    // Something else on the port.
    if (host === "10.0.0.5") return answer({ hello: "world" });
    return refused();
  };
  const addresses = Array.from({ length: 10 }, (_, i) => `10.0.0.${i + 1}`);
  expect(await findRegistries(addresses)).toEqual([
    { host: "10.0.0.3", port: 19150 },
    { host: "10.0.0.7", port: 19150 },
  ]);
  expect(asked).toHaveLength(10);
  expect(asked[0]).toBe("http://10.0.0.1:19150/servers");
});

test("a host that does not answer is given up on after the timeout", async () => {
  jest.useFakeTimers();
  respond = async (host, init) =>
    host === "10.0.0.2" ? answer({ servers: [] }) : silent(init);
  let found: unknown = null;
  findRegistries(["10.0.0.1", "10.0.0.2"], { ms: 500 }).then(
    (hosts) => (found = hosts),
  );
  await jest.advanceTimersByTimeAsync(499);
  expect(found).toBe(null);
  await jest.advanceTimersByTimeAsync(1);
  expect(found).toEqual([{ host: "10.0.0.2", port: 19150 }]);
});

test("at most `concurrency` addresses are asked at a time", async () => {
  let open = 0;
  let most = 0;
  respond = async () => {
    open++;
    most = Math.max(most, open);
    await new Promise((r) => setImmediate(r));
    open--;
    return refused();
  };
  const addresses = Array.from({ length: 100 }, (_, i) => `10.0.1.${i + 1}`);
  await findRegistries(addresses, { concurrency: 32 });
  expect(asked).toHaveLength(100);
  expect(most).toBe(32);
});

test("once aborted, no new address is asked", async () => {
  respond = async () => refused();
  const controller = new AbortController();
  controller.abort();
  expect(
    await findRegistries(["10.0.0.1"], { signal: controller.signal }),
  ).toEqual([]);
  expect(asked).toEqual([]);
});
