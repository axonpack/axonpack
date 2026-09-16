/**
 * The dev-server half of this package is Node code, but the package's tsconfig lists only `jest` in
 * `types` on purpose: pulling in `@types/node` globally changes what `setTimeout` returns for every
 * React Native file beside it. So the handful of Node APIs this folder uses are declared here, where
 * they reach nothing else.
 */

declare module "node:crypto" {
  const crypto: { randomUUID(): string };
  export default crypto;
}

declare module "node:fs" {
  type FileContents = Uint8Array & { toString(encoding: string): string };
  const fs: {
    readFile(
      path: string,
      callback: (error: Error | null, data: FileContents) => void,
    ): void;
  };
  export default fs;
}

declare module "node:path" {
  const path: {
    join(...parts: string[]): string;
    dirname(target: string): string;
    extname(target: string): string;
    normalize(target: string): string;
  };
  export default path;
}

declare module "node:module" {
  type Require = (<T = unknown>(id: string) => T) & {
    resolve(id: string, options?: { paths: string[] }): string;
  };
  export function createRequire(url: string): Require;
}

declare const process: { cwd(): string };
