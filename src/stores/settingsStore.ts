import { create } from "zustand";

type SettingsState = {
  apiBaseUrl: string;
  setApiBaseUrl: (value: string) => void;
};

const STORAGE_KEY = "mtp_settings_v1";

function initialBaseUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { apiBaseUrl?: string };
      if (parsed.apiBaseUrl) return parsed.apiBaseUrl;
    }
  } catch {}
  return import.meta.env.VITE_API_BASE_URL ?? "";
}

export const useSettingsStore = create<SettingsState>((set) => ({
  apiBaseUrl: initialBaseUrl(),
  setApiBaseUrl: (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiBaseUrl: value }));
    set({ apiBaseUrl: value });
  },
}));
