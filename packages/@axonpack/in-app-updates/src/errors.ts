export type VersionCheckErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "ABORTED"
  | "HTTP"
  | "PARSE"
  | "NOT_FOUND"
  | "INVALID_VERSION"
  | "INVALID_PROVIDER"
  | "UNAVAILABLE"
  | "UNSUPPORTED_PLATFORM";

export class VersionCheckError extends Error {
  readonly code: VersionCheckErrorCode;

  constructor(
    code: VersionCheckErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class NetworkError extends VersionCheckError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("NETWORK", message, options);
  }
}

export class TimeoutError extends VersionCheckError {
  constructor(ms: number) {
    super("TIMEOUT", `Request timed out after ${ms}ms`);
  }
}

export class AbortedError extends VersionCheckError {
  constructor() {
    super("ABORTED", "Request was aborted");
  }
}

export class HttpError extends VersionCheckError {
  readonly status: number;

  constructor(status: number, url: string) {
    super("HTTP", `Request to ${url} failed with status ${status}`);
    this.status = status;
  }
}

/** The page or JSON came back, but the version could not be read from it. */
export class ParseError extends VersionCheckError {
  constructor(message: string) {
    super("PARSE", message);
  }
}

/** The store has no listing for this app (wrong bundle id, or not published in that country). */
export class NotFoundError extends VersionCheckError {
  constructor(message: string) {
    super("NOT_FOUND", message);
  }
}

export class InvalidVersionError extends VersionCheckError {
  constructor(version: unknown) {
    super("INVALID_VERSION", `Invalid version: ${JSON.stringify(version)}`);
  }
}

export class InvalidProviderError extends VersionCheckError {
  constructor(provider: unknown) {
    super("INVALID_PROVIDER", `Invalid provider: ${String(provider)}`);
  }
}

/** No version info source could be loaded, or it has no value for what was asked. */
export class VersionInfoUnavailableError extends VersionCheckError {
  constructor(message: string) {
    super("UNAVAILABLE", message);
  }
}

export class UnsupportedPlatformError extends VersionCheckError {
  constructor(platform: string) {
    super(
      "UNSUPPORTED_PLATFORM",
      `No default store provider for platform "${platform}". Pass a provider option.`,
    );
  }
}
