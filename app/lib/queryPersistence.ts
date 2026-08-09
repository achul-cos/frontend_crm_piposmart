"use client";

import type { Query, QueryClient } from "@tanstack/react-query";
import { frontendEnv } from "@/app/lib/env";

const STORAGE_KEY = "piposmart_react_query_cache_v1";

type PersistedEntry = {
  queryKey: readonly unknown[];
  data: unknown;
  updatedAt: number;
};

function isSerializable(value: unknown) {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function isPersistableQuery(query: Query) {
  if (!frontendEnv.enableQueryPersistence) return false;
  if (query.state.status !== "success") return false;
  if (!Array.isArray(query.queryKey) || typeof query.queryKey[0] !== "string") return false;

  const rootKey = query.queryKey[0];
  if (rootKey === "auth") return false;
  if (!isSerializable(query.state.data)) return false;

  try {
    const raw = JSON.stringify(query.state.data);
    return raw.length <= frontendEnv.queryPersistMaxQueryBytes;
  } catch {
    return false;
  }
}

export function clearPersistedQueryCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function restorePersistedQueryCache(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  if (!frontendEnv.enableQueryPersistence) return;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as PersistedEntry[];
    const now = Date.now();

    for (const entry of parsed) {
      if (!Array.isArray(entry.queryKey)) continue;
      if (typeof entry.updatedAt !== "number") continue;
      if (now - entry.updatedAt > frontendEnv.queryPersistMaxAgeMs) continue;

      queryClient.setQueryData(entry.queryKey, entry.data);
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function persistQueryCache(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  if (!frontendEnv.enableQueryPersistence) return;

  const persisted: PersistedEntry[] = [];
  let totalSize = 0;

  for (const query of queryClient.getQueryCache().getAll()) {
    if (!isPersistableQuery(query)) continue;

    const serialized = JSON.stringify(query.state.data);
    const nextSize = totalSize + serialized.length;
    if (nextSize > frontendEnv.queryPersistMaxTotalBytes) continue;

    persisted.push({
      queryKey: query.queryKey,
      data: query.state.data,
      updatedAt: query.state.dataUpdatedAt || Date.now(),
    });
    totalSize = nextSize;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Silent fallback: if storage quota is full the in-memory cache still works.
  }
}
