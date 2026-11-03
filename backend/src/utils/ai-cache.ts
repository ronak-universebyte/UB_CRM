interface ICacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class AiCache {
  private static store = new Map<string, ICacheEntry<any>>();

  static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  static set<T>(key: string, value: T, ttlSeconds: number = 600): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static delete(key: string): void {
    this.store.delete(key);
  }

  static clear(): void {
    this.store.clear();
  }

  static size(): number {
    return this.store.size;
  }
}

