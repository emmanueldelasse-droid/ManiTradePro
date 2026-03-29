import type { ApiEnvelope } from "../types/api";
import { useSettingsStore } from "../stores/settingsStore";

export async function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  const baseUrl = useSettingsStore.getState().apiBaseUrl;
  if (!baseUrl) {
    return {
      status: "not_configured",
      source: null,
      asOf: null,
      freshness: "unknown",
      message: "Source non configurée",
      data: null,
    };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: "application/json" } });
    const data = await response.json();
    return data as ApiEnvelope<T>;
  } catch (error) {
    return {
      status: "error",
      source: null,
      asOf: null,
      freshness: "unknown",
      message: error instanceof Error ? error.message : "Erreur réseau",
      data: null,
    };
  }
}
