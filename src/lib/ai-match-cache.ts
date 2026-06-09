import 'server-only';

import { createHash } from 'crypto';

import type { MatchMetadata } from '@/lib/types';

const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const globalWithMatchCache = globalThis as typeof globalThis & {
  aiMatchCache?: Map<string, CacheEntry>;
};

const matchCache = globalWithMatchCache.aiMatchCache ?? new Map<string, CacheEntry>();
globalWithMatchCache.aiMatchCache = matchCache;

export function createMatchCacheKey(namespace: string, input: unknown) {
  return `${namespace}:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

export function getCachedMatch<T extends { matchMetadata: MatchMetadata }>(key: string): T | null {
  const entry = matchCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    matchCache.delete(key);
    return null;
  }

  const value = structuredClone(entry.value) as T;
  value.matchMetadata.cached = true;
  return value;
}

export function setCachedMatch<T>(key: string, value: T) {
  const now = Date.now();

  if (matchCache.size >= MAX_CACHE_ENTRIES) {
    for (const [cacheKey, entry] of matchCache) {
      if (entry.expiresAt <= now) matchCache.delete(cacheKey);
    }
    if (matchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = matchCache.keys().next().value;
      if (oldestKey) matchCache.delete(oldestKey);
    }
  }

  matchCache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    value: structuredClone(value),
  });
}

export function clearMatchCache() {
  matchCache.clear();
}
