import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { FreshnessBadge } from "../components/common/FreshnessBadge";
import { StatCard } from "../components/common/StatCard";
import { marketApi } from "../services/marketApi";
import { formatCurrency } from "../utils/format";
import { useUiStore } from "../stores/uiStore";

export function DashboardScreen() {
  const navigate = useUiStore((s) => s.navigate);
  const opportunitiesQuery = useQuery({ queryKey: ["opportunities"], queryFn: () => marketApi.getOpportunities() });
  const fearGreedQuery = useQuery({ queryKey: ["fear-greed"], queryFn: () => marketApi.getFearGreed() });
  const trendingQuery = useQuery({ queryKey: ["trending"], queryFn: () => marketApi.getTrending() });
  const portfolioQuery = useQuery({ queryKey: ["portfolio-summary"], queryFn: () => marketApi.getPortfolioSummary() });

  if (opportunitiesQuery.isLoading) return <div className="screen"><LoadingState title="Chargement du dashboard..." /></div>;
  if (opportunitiesQuery.data?.status === "error") return <div className="screen"><ErrorState /></div>;

  const opportunities = opportunitiesQuery.data?.data ?? [];
  const top = opportunities.slice(0, 5);

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="screen-title">Dashboard</div>
        <div className="screen-subtitle">Aucune donnée fictive</div>
      </div>

      <div className="dashboard-hero">
        <div className="hero-label">Portefeuille réel</div>
        <div className="hero-capital">{formatCurrency(portfolioQuery.data?.data?.totalEquity ?? null, "EUR")}</div>
        <div className="hero-pnl">
          <span className="hero-mode-tag real">réel</span>
          <FreshnessBadge freshness={portfolioQuery.data?.freshness ?? "unknown"} source={portfolioQuery.data?.source} asOf={portfolioQuery.data?.asOf} />
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: "1rem" }}>
        <StatCard label="Opportunités" value={opportunities.length} />
        <StatCard label="Fear & Greed" value={fearGreedQuery.data?.data?.value ?? "—"} sub={fearGreedQuery.data?.data?.label ?? "Donnée indisponible"} />
        <StatCard label="Trending" value={trendingQuery.data?.data?.length ?? 0} />
        <StatCard label="PnL réel" value={formatCurrency(portfolioQuery.data?.data?.totalPnl ?? null, "EUR")} />
      </div>

      <div className="section-title"><span>Top opportunités</span></div>
      {top.length === 0 ? <EmptyState title="Aucune opportunité exploitable" description="Les scores ne sortent que si les données sont suffisantes." /> : (
        <div>
          {top.map((item, index) => (
            <button key={item.symbol} className="opp-row" onClick={() => navigate("asset-detail", { symbol: item.symbol })}>
              <div className="opp-rank">#{index + 1}</div>
              <div className="opp-asset">
                <div className="opp-asset-line1">
                  <span className="asset-symbol">{item.symbol}</span>
                  <span className={`direction-tag ${(item.direction ?? "neutral")}`}>{item.direction ?? "neutral"}</span>
                </div>
                <div className="asset-name">{item.analysisLabel}</div>
              </div>
              <div className="opp-price-col">
                <div className="opp-price">{item.price === null ? "—" : item.price.toLocaleString("fr-FR")}</div>
                <div className={`opp-change ${(item.change24hPct ?? 0) >= 0 ? "up" : "down"}`}>{item.change24hPct === null ? "—" : `${item.change24hPct.toFixed(2)}%`}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
