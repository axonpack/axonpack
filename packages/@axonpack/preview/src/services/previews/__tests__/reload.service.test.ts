import { reload } from "../reload.service";

test("reports false instead of throwing when the native module is not linked", () => {
  expect(reload()).toBe(false);
});
