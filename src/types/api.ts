export type ApiStatus = "ok" | "partial" | "unavailable" | "not_configured" | "error";
export type FreshnessLevel = "live" | "recent" | "stale" | "unknown";

export type ApiEnvelope<T> = {
  status: ApiStatus;
  source: string | null;
  asOf: string | null;
  freshness: FreshnessLevel;
  message: string | null;
  data: T | null;
};
