import { buildCompatibility, buildKey, buildSlug } from "../build-info.service";

test("is null where the native module is not linked", () => {
  expect(buildKey()).toBeNull();
  expect(buildCompatibility()).toBeNull();
  expect(buildSlug()).toBeNull();
});
