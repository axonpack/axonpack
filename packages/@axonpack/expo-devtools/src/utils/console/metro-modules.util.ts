type MetroModule = {
  verboseName?: string;
  isInitialized: boolean;
  publicModule: { exports: unknown };
};

type MetroRequire = ((moduleId: number | string) => unknown) & {
  /** Only defined under `__DEV__` — a release bundle has no module registry to enumerate. */
  getModules?: () => Map<number, MetroModule>;
};

/**
 * Metro compiles every module into a closure, so a REPL can't reach an `import`ed binding by name
 * the way a browser console reaches a page's globals. Its runtime does set `global.__r`, though,
 * and under `__DEV__` that carries a registry of every loaded module keyed by source path — enough
 * to reach app code with no wiring from the consumer. Undocumented Metro internals: treat a missing
 * registry as normal, not as an error.
 */
function getRegistry(): Map<number, MetroModule> | undefined {
  const metroRequire = (globalThis as { __r?: MetroRequire }).__r;
  return metroRequire?.getModules?.();
}

/** Source paths of the modules Metro has loaded, optionally narrowed to those containing `query`. */
export function listModules(query?: string): string[] {
  const registry = getRegistry();
  if (!registry) return [];

  const names: string[] = [];
  for (const module of registry.values()) {
    if (!module.verboseName) continue;
    if (query && !module.verboseName.includes(query)) continue;
    names.push(module.verboseName);
  }
  return names.sort();
}

/**
 * Exports of the first loaded module whose source path contains `query`. Deliberately skips modules
 * that haven't initialized yet — `__r`-ing one *executes* it, and a REPL lookup shouldn't boot code
 * that the app itself never ran.
 */
export function findModule(query: string): unknown {
  const registry = getRegistry();
  if (!registry) {
    throw new Error(
      'Module registry unavailable — Metro only exposes it in a development build (__DEV__).'
    );
  }

  for (const module of registry.values()) {
    if (module.isInitialized && module.verboseName?.includes(query)) {
      return module.publicModule.exports;
    }
  }

  const loaded = listModules(query);
  throw new Error(
    loaded.length > 0
      ? `No initialized module matches "${query}". Loaded but not initialized: ${loaded.join(', ')}`
      : `No loaded module matches "${query}". Try $modules() to list them.`
  );
}
