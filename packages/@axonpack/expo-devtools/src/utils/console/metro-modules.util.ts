type MetroModule = {
  verboseName?: string;
  isInitialized: boolean;
  publicModule: { exports: unknown };
};

type MetroRequire = ((moduleId: number | string) => unknown) & {
  getModules?: () => Map<number, MetroModule>;
};

function getRegistry(): Map<number, MetroModule> | undefined {
  const metroRequire = (globalThis as { __r?: MetroRequire }).__r;
  return metroRequire?.getModules?.();
}

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
