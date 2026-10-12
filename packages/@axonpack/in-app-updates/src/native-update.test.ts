import { baseInfo, fake } from "./native-fake.test-helper";
import {
  completeNativeUpdate,
  getNativeUpdateState,
  setNativeUpdateFake,
  startNativeUpdate,
} from "./native-update";

const starts = () => fake.calls.filter((c) => c.startsWith("start"));

beforeEach(() => {
  fake.reset();
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});

test("accepted, declined and failed follow Play's result codes", async () => {
  fake.startCode = -1;
  expect(await startNativeUpdate("flexible")).toBe("accepted");
  fake.startCode = 0;
  expect(await startNativeUpdate("flexible")).toBe("declined");
  fake.startCode = 1;
  expect(await startNativeUpdate("flexible")).toBe("failed");
});

test("a start that throws is a failure, not a crash", async () => {
  fake.startError = true;
  expect(await startNativeUpdate("immediate")).toBe("failed");
});

test("the kind picks the flow", async () => {
  await startNativeUpdate("immediate");
  await startNativeUpdate("flexible");
  expect(starts()).toEqual(["start:immediate", "start:flexible"]);
});

test("a rejecting getUpdateInfo (sideloaded build) is unavailable, and nothing starts", async () => {
  fake.infoError = true;
  expect(await startNativeUpdate("flexible")).toBe("unavailable");
  expect(fake.calls).toEqual(["info"]);
});

test("no update, or a kind Play does not allow, is unavailable", async () => {
  fake.info = { ...baseInfo, available: false };
  expect(await startNativeUpdate("flexible")).toBe("unavailable");
  fake.info = { ...baseInfo, immediateAllowed: false };
  expect(await startNativeUpdate("immediate")).toBe("unavailable");
  expect(starts()).toEqual([]);
});

test("an immediate update that was left can be resumed", async () => {
  fake.info = { ...baseInfo, available: false, inProgress: true };
  expect(await startNativeUpdate("immediate")).toBe("accepted");
  expect(starts()).toEqual(["start:immediate"]);
});

test("status events reach onStatus, and the listener is removed when the update ends", async () => {
  const seen: number[] = [];
  await startNativeUpdate("flexible", (s) => seen.push(s.status));
  expect(fake.listeners.size).toBe(1);
  for (const code of [2, 11, 4]) fake.emit(code);
  expect(seen).toEqual([2, 11, 4]);
  expect(fake.listeners.size).toBe(0);
});

test("a failed download also removes the listener", async () => {
  await startNativeUpdate("flexible", () => {});
  fake.emit(5);
  expect(fake.listeners.size).toBe(0);
});

test("starting again replaces the old listener instead of stacking", async () => {
  await startNativeUpdate("flexible", () => {});
  await startNativeUpdate("flexible", () => {});
  expect(fake.listeners.size).toBe(1);
});

test("an immediate update drops its listener once it has resolved", async () => {
  await startNativeUpdate("immediate", () => {});
  expect(fake.listeners.size).toBe(0);
});

test("two taps start one update", async () => {
  const first = startNativeUpdate("flexible");
  const second = startNativeUpdate("flexible");
  expect(await Promise.all([first, second])).toEqual(["accepted", "accepted"]);
  expect(starts()).toHaveLength(1);
});

test("getNativeUpdateState tells resume, install and nothing apart", async () => {
  expect(await getNativeUpdateState()).toBe("none");
  fake.info = { ...baseInfo, inProgress: true };
  expect(await getNativeUpdateState()).toBe("in-progress");
  fake.info = { ...baseInfo, installStatus: 11 };
  expect(await getNativeUpdateState()).toBe("downloaded");
  fake.infoError = true;
  expect(await getNativeUpdateState()).toBe("none");
});

test("completeNativeUpdate asks Play to install", async () => {
  await completeNativeUpdate();
  expect(fake.calls).toEqual(["complete"]);
});

test("the fake only turns on when __DEV__ is true", async () => {
  await expect(setNativeUpdateFake("flexibleAccepted")).rejects.toThrow(
    "__DEV__",
  );
  expect(fake.calls).toEqual([]);
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  await setNativeUpdateFake("flexibleAccepted");
  await setNativeUpdateFake(null);
  expect(fake.calls).toEqual(["fake:flexibleAccepted", "fake:null"]);
});
