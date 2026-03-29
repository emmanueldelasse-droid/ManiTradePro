import { useUiStore, type AppRoute } from "../../stores/uiStore";
const items: Array<{ route: AppRoute; label: string; icon: string }> = [
  { route: "dashboard", label: "Accueil", icon: "⌂" },
  { route: "opportunities", label: "Signaux", icon: "◎" },
  { route: "portfolio", label: "Trades", icon: "◫" },
  { route: "news", label: "News", icon: "◌" },
  { route: "settings", label: "Réglages", icon: "◦" },
];
export function BottomNav() {
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  return <nav className="bottom-nav">{items.map((item)=><button key={item.route} className={`bnav-item ${route===item.route?"active":""}`} onClick={()=>navigate(item.route)}><span className="bnav-icon">{item.icon}</span><span>{item.label}</span></button>)}</nav>;
}
