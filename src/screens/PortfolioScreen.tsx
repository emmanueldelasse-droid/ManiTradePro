import { useQuery } from "@tanstack/react-query";
import { marketApi } from "../services/marketApi";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";

export function PortfolioScreen() {
  const summaryQuery = useQuery({ queryKey: ["portfolio-summary"], queryFn: () => marketApi.getPortfolioSummary() });
  const positionsQuery = useQuery({ queryKey: ["portfolio-positions"], queryFn: () => marketApi.getPortfolioPositions() });
  if (summaryQuery.isLoading || positionsQuery.isLoading) return <div className="screen"><LoadingState /></div>;
  const positions = positionsQuery.data?.data ?? [];
  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">Mes trades</div><div className="screen-subtitle">Aucun trade réel inventé</div></div>
      <div className="pf-hero"><div><div className="pf-hero-label">Capital réel</div><div className="pf-pnl-big">{summaryQuery.data?.data?.totalEquity == null ? "Aucun compte réel" : `${summaryQuery.data.data.totalEquity.toLocaleString("fr-FR")} €`}</div></div></div>
      {positions.length === 0 ? <EmptyState title="Aucune position réelle" description={positionsQuery.data?.message ?? "Connecte une vraie source portefeuille pour afficher des positions."} /> : positions.map((pos)=><div key={pos.id} className="pf-card"><div className="pf-card-header"><div><div className="asset-symbol">{pos.symbol}</div><div className="asset-name">{pos.name ?? "Nom indisponible"}</div></div><div className="pf-card-pnl"><div className={`pnl-main ${(pos.pnl ?? 0)>=0?"positive":"negative"}`}>{pos.pnl ?? "—"}</div><div className="pnl-pct">{pos.pnlPct ?? "—"}</div></div></div></div>)}
    </div>
  );
}
