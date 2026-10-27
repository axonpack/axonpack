import { EMPTY_SHA256, sha256Hex, signRequest } from "./sigv4";

// Vectors from AWS's signing test suite (awslabs/aws-c-auth, tests/aws-signing-test-suite/v4).
const suite = {
  region: "us-east-1",
  service: "service",
  date: new Date("2015-08-30T12:36:00Z"),
  credentials: {
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  },
};

const signatureOf = (headers: Record<string, string>) =>
  headers.Authorization.split("Signature=")[1];

test("get-vanilla", () => {
  const headers = signRequest({
    ...suite,
    method: "GET",
    url: "https://example.amazonaws.com/",
    addContentSha256: false,
  });
  expect(signatureOf(headers)).toBe(
    "5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
  );
  expect(headers.Authorization).toContain(
    "Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date,",
  );
});

test("get-vanilla-query-order-key-case", () => {
  const headers = signRequest({
    ...suite,
    method: "GET",
    url: "https://example.amazonaws.com/?Param2=value2&Param1=value1",
    addContentSha256: false,
  });
  expect(signatureOf(headers)).toBe(
    "b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
  );
});

test("get-utf8", () => {
  const headers = signRequest({
    ...suite,
    method: "GET",
    url: "https://example.amazonaws.com/ሴ",
    addContentSha256: false,
  });
  expect(signatureOf(headers)).toBe(
    "8318018e0b0f223aa2bbf98705b62bb787dc9c0e678f255a891fd03141be5d85",
  );
});

test("post-x-www-form-urlencoded, with the body hash signed", () => {
  const body = "Param1=value1";
  const headers = signRequest({
    ...suite,
    method: "POST",
    url: "https://example.amazonaws.com/",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": "13",
    },
    payloadHash: sha256Hex(body),
  });
  expect(headers["x-amz-content-sha256"]).toBe(
    "9095672bbd1f56dfc5b65f3e153adc8731a4a654192329106275f4c7b24d0b6e",
  );
  expect(signatureOf(headers)).toBe(
    "d3875051da38690788ef43de4db0d8f280229d82040bfac253562e56c3f20e0b",
  );
});

test("hashes an empty body to the well-known value", () => {
  expect(sha256Hex("")).toBe(EMPTY_SHA256);
});
