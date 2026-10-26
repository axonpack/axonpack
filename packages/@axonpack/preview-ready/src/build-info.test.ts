import { buildFingerprint } from "./build-info";

test("is null where the native module is not linked", () => {
  expect(buildFingerprint()).toBeNull();
});
