import { useQuery } from "@tanstack/react-query";
import { marketApi } from "../services/marketApi";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { useUiStore } from "../stores/uiStore";

export function OpportunitiesScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const query = useQuery({ queryKey: ["opportunities"], queryFn: () => marketApi.getOpportunities() });
  if (query.isLoading) return <div className="screen"><LoadingState /></div>;
  if (query.data?.status === "error") return <div className="screen"><ErrorState /></div>;
  const items = query.data?.data ?? [];
  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">Opportunités</div><div className="screen-subtitle">Classement sur données réelles</div></div>
      {items.length === 0 ? <EmptyState title="Aucune opportunité" description="Pas de score si les données sont incomplètes." /> : items.map((item, index) => (
        <button key={item.symbol} className="opp-row" onClick={() => navigate("asset-detail", { symbol: item.symbol })}>
          <div className="opp-rank">#{index + 1}</div>
          <div className="opp-asset"><div className="opp-asset-line1"><span className="asset-symbol">{item.symbol}</span><span className={`direction-tag ${(item.direction ?? "neutral")}`}>{item.direction ?? "neutral"}</span><span className="score-badge strong">{item.confidence}</span></div><div className="asset-name">{item.analysisLabel}</div></div>
          <div className="opp-price-col"><div className="opp-price">{item.price === null ? "—" : item.price.toLocaleString("fr-FR")}</div><div className={`opp-change ${(item.change24hPct ?? 0) >= 0 ? "up" : "down"}`}>{item.change24hPct === null ? "—" : `${item.change24hPct.toFixed(2)}%`}</div></div>
          <div className="opp-score-col"><span className="solid-badge">{item.score === null ? "—" : Math.round(item.score)}</span></div>
        </button>
      ))}
    </div>
  );
}
