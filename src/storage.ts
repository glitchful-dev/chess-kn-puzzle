// Per-browser conveniences only (options, best scores). Storage can be blocked or
// cleared, so every read and write tolerates failure.

export function load<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const out = { ...fallback };
    for (const k of Object.keys(fallback) as (keyof T)[]) {
      const v = (parsed as Partial<T>)[k];
      if (v !== undefined && (v === null || typeof v === typeof fallback[k] || fallback[k] === null)) {
        out[k] = v as T[keyof T];
      }
    }
    return out;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not stored; the page works the same without it.
  }
}
