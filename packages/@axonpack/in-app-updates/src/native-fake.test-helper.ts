import { mock } from "bun:test";

import type { NativeInstallStatus, NativeUpdateInfo } from "./native-update";

/** A stand-in for the Android module, shared by every test file so their mocks cannot disagree. */
export const baseInfo: NativeUpdateInfo = {
  available: true,
  inProgress: false,
  availableVersionCode: 9,
  updatePriority: 0,
  stalenessDays: 1,
  installStatus: 0,
  flexibleAllowed: true,
  immediateAllowed: true,
};

export const fake = {
  calls: [] as string[],
  listeners: new Set<(s: NativeInstallStatus) => void>(),
  info: { ...baseInfo } as NativeUpdateInfo,
  infoError: false,
  startCode: -1,
  startError: false,
  reset() {
    this.calls.length = 0;
    this.listeners.clear();
    this.info = { ...baseInfo };
    this.infoError = false;
    this.startCode = -1;
    this.startError = false;
  },
  emit(code: number) {
    const status = {
      status: code,
      bytesDownloaded: 0,
      totalBytesToDownload: 0,
      errorCode: 0,
    };
    this.listeners.forEach((l) => l(status));
  },
};

const native = {
  getUpdateInfo: async () => {
    fake.calls.push("info");
    if (fake.infoError)
      throw new Error("The app is not owned by any user on this device.");
    return fake.info;
  },
  startUpdate: async (immediate: boolean) => {
    fake.calls.push(`start:${immediate ? "immediate" : "flexible"}`);
    if (fake.startError) throw new Error("start failed");
    return fake.startCode;
  },
  completeUpdate: async () => {
    fake.calls.push("complete");
  },
  setFakeScenario: async (scenario: string | null) => {
    fake.calls.push(`fake:${scenario}`);
  },
  addListener: (_name: string, listener: (s: NativeInstallStatus) => void) => {
    fake.listeners.add(listener);
    return { remove: () => fake.listeners.delete(listener) };
  },
};

mock.module("expo", () => ({ requireOptionalNativeModule: () => native }));
