import { reload } from "./reload";

test("reports false instead of throwing when the native module is not linked", () => {
  expect(reload()).toBe(false);
});
