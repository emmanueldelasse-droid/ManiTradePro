import { BottomNav } from "./components/layout/BottomNav";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastHost } from "./components/common/ToastHost";
import { DashboardScreen } from "./screens/DashboardScreen";
import { OpportunitiesScreen } from "./screens/OpportunitiesScreen";
import { AssetDetailScreen } from "./screens/AssetDetailScreen";
import { PortfolioScreen } from "./screens/PortfolioScreen";
import { NewsScreen } from "./screens/NewsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TrainingScreen } from "./screens/TrainingScreen";
import { useUiStore } from "./stores/uiStore";

export default function App() {
  const { route, routeParams } = useUiStore();

  let content: JSX.Element;
  switch (route) {
    case "dashboard":
      content = <DashboardScreen />;
      break;
    case "opportunities":
      content = <OpportunitiesScreen />;
      break;
    case "asset-detail":
      content = <AssetDetailScreen symbol={routeParams?.symbol ?? null} />;
      break;
    case "portfolio":
      content = <PortfolioScreen />;
      break;
    case "news":
      content = <NewsScreen />;
      break;
    case "settings":
      content = <SettingsScreen />;
      break;
    case "training":
      content = <TrainingScreen />;
      break;
    default:
      content = <DashboardScreen />;
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">{content}</main>
        <BottomNav />
      </div>
      <ToastHost />
    </>
  );
}
