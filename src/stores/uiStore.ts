import { create } from "zustand";

export type AppRoute =
  | "dashboard"
  | "opportunities"
  | "asset-detail"
  | "portfolio"
  | "news"
  | "settings"
  | "training";

type RouteParams = { symbol?: string } | null;

type UiStore = {
  route: AppRoute;
  routeParams: RouteParams;
  navigate: (route: AppRoute, routeParams?: RouteParams) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  route: "dashboard",
  routeParams: null,
  navigate: (route, routeParams = null) => set({ route, routeParams }),
}));
