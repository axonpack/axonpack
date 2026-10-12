import { createDefaultSource } from "./source";

let mockPlatform = "android";

jest.mock("./runtime", () => ({
  currentPlatform: () => mockPlatform,
  isStorePlatform: (v: string) => v === "ios" || v === "android",
  reactNative: () => undefined,
}));

// expo-application is an optional peer, so it is not installed here.
jest.mock(
  "expo-application",
  () => ({
    applicationId: "com.example.app",
    nativeApplicationVersion: "1.0.0",
    nativeBuildVersion: "10",
  }),
  { virtual: true },
);

describe("the version source read from expo-application", () => {
  test("gives the installed version and bundle id", () => {
    const source = createDefaultSource();
    expect(source.getCurrentVersion()).toBe("1.0.0");
    expect(source.getPackageName()).toBe("com.example.app");
  });

  test("gives the Android build as a number", () => {
    mockPlatform = "android";
    expect(createDefaultSource().getCurrentBuildNumber()).toBe(10);
  });

  test("gives the iOS build as a string", () => {
    mockPlatform = "ios";
    expect(createDefaultSource().getCurrentBuildNumber()).toBe("10");
  });
});
