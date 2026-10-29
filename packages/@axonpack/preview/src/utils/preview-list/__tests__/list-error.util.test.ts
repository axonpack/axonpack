import { DEFAULT_LABELS } from "../../../constants/preview-list/theme.const";
import { describeListError } from "../list-error.util";

const ANDROID_REFUSED =
  "fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9000";
const HINT =
  "On the Android emulator, use `10.0.2.2`, or run `adb reverse tcp:9000 tcp:9000`.";

const describe_ = (raw: string, bucketUrl: string, platform: string | null) =>
  describeListError(raw, { bucketUrl, platform, labels: DEFAULT_LABELS });

test("a bucket that does not answer is named, and the raw text stays off the screen", () => {
  expect(
    describe_("Network request failed", "http://192.168.1.5:9000/b", "ios"),
  ).toEqual({
    message: "Can't reach the bucket at 192.168.1.5:9000.",
    hint: null,
    retryable: true,
  });
});

test.each([
  ["android", "http://localhost:9000/b", true],
  ["android", "http://127.0.0.1:9000/b", true],
  ["android", "http://10.0.2.2:9000/b", false],
  ["ios", "http://localhost:9000/b", false],
])("the emulator hint shows on %s for %s: %s", (platform, url, hinted) => {
  const { message, hint } = describe_(ANDROID_REFUSED, url, platform);
  expect(message).toMatch(/^Can't reach the bucket at [^ ]+\.$/);
  expect(hint).toBe(hinted ? HINT : null);
});

test("access denied and not found each say what went wrong, then what to check", () => {
  expect(
    describe_(
      "S3 403 for index/ios/k.json: <Code>AccessDenied</Code>",
      "http://localhost:9000/b",
      "ios",
    ),
  ).toEqual({
    message: "The bucket refused access.",
    hint: "Check the read key or the bucket's policy.",
    retryable: true,
  });
  expect(
    describe_(
      "Download of previews/a.hbc failed (404).",
      "http://localhost:9000/b",
      "ios",
    ),
  ).toEqual({
    message: "The bucket or the file was not found.",
    hint: "Check the bucket URL in the preview config.",
    retryable: true,
  });
});

test("anything else says so, with the raw message as the hint", () => {
  expect(describe_("Disk full", "http://localhost:9000/b", "ios")).toEqual({
    message: "Something went wrong.",
    hint: "Disk full",
    retryable: true,
  });
});

test("a missing or partial bucket URL can't be retried, since it is in the build", () => {
  for (const url of ["", "  ", "/b", "localhost:9000/b"])
    expect(describe_("No bucket URL.", url, "ios").retryable).toBe(false);
});
