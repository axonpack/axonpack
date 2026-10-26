// An in-memory stand-in for the parts of expo-file-system the package uses.
type Part = string | { uri: string };

export const disk = new Map<string, Uint8Array | "dir">();

const join = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === "string" ? p : p.uri))
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

const parentsOf = (uri: string) => {
  const out: string[] = [];
  let at = uri;
  while (at.includes("/")) {
    at = at.slice(0, at.lastIndexOf("/"));
    if (at) out.push(at);
  }
  return out;
};

export class Directory {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf("/") + 1);
  }
  get exists() {
    return disk.get(this.uri) === "dir";
  }
  create(options: { intermediates?: boolean } = {}) {
    if (options.intermediates)
      parentsOf(this.uri).forEach((p) => disk.set(p, "dir"));
    disk.set(this.uri, "dir");
  }
  delete() {
    for (const key of [...disk.keys()]) {
      if (key === this.uri || key.startsWith(`${this.uri}/`)) disk.delete(key);
    }
  }
  list() {
    return [...disk.entries()]
      .filter(
        ([key]) =>
          key.startsWith(`${this.uri}/`) &&
          !key.slice(this.uri.length + 1).includes("/"),
      )
      .map(([key, value]) =>
        value === "dir" ? new Directory(key) : new File(key),
      );
  }
  rename(newName: string) {
    const target = `${this.uri.slice(0, this.uri.lastIndexOf("/"))}/${newName}`;
    for (const [key, value] of [...disk.entries()]) {
      if (key === this.uri || key.startsWith(`${this.uri}/`)) {
        disk.delete(key);
        disk.set(target + key.slice(this.uri.length), value);
      }
    }
    this.uri = target;
  }
}

export class File {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get exists() {
    return disk.get(this.uri) instanceof Uint8Array;
  }
  create(options: { intermediates?: boolean } = {}) {
    if (options.intermediates)
      parentsOf(this.uri).forEach((p) => disk.set(p, "dir"));
    disk.set(this.uri, new Uint8Array());
  }
  async write(content: string | Uint8Array) {
    disk.set(
      this.uri,
      typeof content === "string" ? new TextEncoder().encode(content) : content,
    );
  }
  async text() {
    return new TextDecoder().decode(disk.get(this.uri) as Uint8Array);
  }
  delete() {
    disk.delete(this.uri);
  }
}

export const Paths = { document: new Directory("file:///docs") };
