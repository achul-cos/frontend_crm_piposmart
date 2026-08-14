"use client";

function readBoolean(raw: string | undefined, fallback: boolean) {
  if (raw === undefined) return fallback;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function readPositiveInteger(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const frontendEnv = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080",
  enableApiErrorDebug: readBoolean(
    process.env.NEXT_PUBLIC_ENABLE_API_ERROR_DEBUG,
    true,
  ),
  enableQueryPersistence: readBoolean(
    process.env.NEXT_PUBLIC_ENABLE_QUERY_PERSIST,
    true,
  ),
  queryPersistMaxAgeMs:
    readPositiveInteger(
      process.env.NEXT_PUBLIC_QUERY_PERSIST_MAX_AGE_MINUTES,
      15,
    ) * 60_000,
  queryPersistMaxTotalBytes: readPositiveInteger(
    process.env.NEXT_PUBLIC_QUERY_PERSIST_MAX_TOTAL_BYTES,
    1_000_000,
  ),
  queryPersistMaxQueryBytes: readPositiveInteger(
    process.env.NEXT_PUBLIC_QUERY_PERSIST_MAX_QUERY_BYTES,
    150_000,
  ),
  enableReactQueryDevtools: readBoolean(
    process.env.NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS,
    false,
  ),
};

