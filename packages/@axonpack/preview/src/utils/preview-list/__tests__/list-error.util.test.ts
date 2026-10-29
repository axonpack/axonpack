import { DEFAULT_LABELS } from "../../../constants/preview-list/theme.const";
import { describeListError } from "../list-error.util";

const ANDROID_REFUSED =
  "fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9000";
const HINT =
  "On the Android emulator, use 10.0.2.2, or run adb reverse tcp:9000 tcp:9000.";

const describe_ = (raw: string, bucketUrl: string, platform: string | null) =>
  describeListError(raw, { bucketUrl, platform, labels: DEFAULT_LABELS });

test("a bucket that does not answer is named, and the raw text stays off the screen", () => {
  expect(
    describe_("Network request failed", "http://192.168.1.5:9000/b", "ios"),
  ).toEqual({
    message: "Can't reach the bucket at 192.168.1.5:9000.",
    detail: null,
  });
});

test.each([
  ["android", "http://localhost:9000/b", true],
  ["android", "http://127.0.0.1:9000/b", true],
  ["android", "http://10.0.2.2:9000/b", false],
  ["ios", "http://localhost:9000/b", false],
])("the emulator hint shows on %s for %s: %s", (platform, url, hinted) => {
  const { message } = describe_(ANDROID_REFUSED, url, platform);
  expect(message.startsWith("Can't reach the bucket at ")).toBe(true);
  expect(message.includes(HINT)).toBe(hinted);
});

test("access denied and not found each get a plain line", () => {
  expect(
    describe_(
      "S3 403 for index/ios/k.json: <Code>AccessDenied</Code>",
      "",
      "ios",
    ),
  ).toEqual({ message: DEFAULT_LABELS.errorForbidden, detail: null });
  expect(
    describe_("Download of previews/a.hbc failed (404).", "", "ios"),
  ).toEqual({ message: DEFAULT_LABELS.errorNotFound, detail: null });
});

test("anything else says so, with the raw message", () => {
  expect(describe_("Disk full", "", "ios")).toEqual({
    message: "Something went wrong.",
    detail: "Disk full",
  });
});
