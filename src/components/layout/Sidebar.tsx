import { useUiStore, type AppRoute } from "../../stores/uiStore";

const items: Array<{ route: AppRoute; label: string; icon: string }> = [
  { route: "dashboard", label: "Accueil", icon: "⌂" },
  { route: "opportunities", label: "Opportunités", icon: "◎" },
  { route: "portfolio", label: "Mes trades", icon: "◫" },
  { route: "news", label: "News", icon: "◌" },
  { route: "training", label: "Entraînement", icon: "◈" },
  { route: "settings", label: "Réglages", icon: "◦" },
];

export function Sidebar() {
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">M</div>
        <div className="logo-text">ManiTrade<strong>Pro</strong></div>
      </div>
      <div className="nav-list">
        {items.map((item) => (
          <button key={item.route} className={`nav-item ${route === item.route ? "active" : ""}`} onClick={() => navigate(item.route)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-status"><span className="status-dot active" />Données réelles uniquement</div>
    </aside>
  );
}
