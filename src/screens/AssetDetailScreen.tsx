import { useQuery } from "@tanstack/react-query";
import { marketApi } from "../services/marketApi";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { FreshnessBadge } from "../components/common/FreshnessBadge";

export function AssetDetailScreen({ symbol }: { symbol: string | null }) {
  const quoteQuery = useQuery({ queryKey: ["quote", symbol], queryFn: () => marketApi.getQuote(symbol ?? ""), enabled: Boolean(symbol) });
  const candlesQuery = useQuery({ queryKey: ["candles", symbol], queryFn: () => marketApi.getCandles(symbol ?? ""), enabled: Boolean(symbol) });
  if (!symbol) return <div className="screen"><EmptyState title="Aucun actif" /></div>;
  if (quoteQuery.isLoading) return <div className="screen"><LoadingState /></div>;
  if (quoteQuery.data?.status === "error") return <div className="screen"><ErrorState /></div>;
  const quote = quoteQuery.data?.data;
  const candles = candlesQuery.data?.data ?? [];
  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">{symbol}</div><div className="screen-subtitle">Détail actif réel</div></div>
      {!quote ? <EmptyState title="Donnée indisponible" /> : <>
        <div className="asset-detail-header">
          <div className="asset-detail-name"><div className="asset-detail-icon">{symbol.slice(0, 2)}</div><div><div className="asset-detail-title">{quote.symbol}</div><div className="asset-detail-full">{quote.name ?? "Nom indisponible"}</div></div></div>
          <div className="asset-price-block"><div className="asset-price-main">{quote.price.toLocaleString("fr-FR")}</div><div className={`asset-price-change ${(quote.change24hPct ?? 0) >= 0 ? "up" : "down"}`}>{quote.change24hPct === null ? "—" : `${quote.change24hPct.toFixed(2)}%`}</div></div>
        </div>
        <FreshnessBadge freshness={quoteQuery.data?.freshness ?? "unknown"} source={quoteQuery.data?.source} asOf={quoteQuery.data?.asOf} />
        <div className="chart-container" style={{ marginTop: 16 }}>
          <div className="card-title">Bougies réelles</div>
          {candles.length === 0 ? <div className="empty-desc" style={{ paddingTop: 12 }}>Donnée indisponible</div> : <div className="empty-desc" style={{ paddingTop: 12 }}>{candles.length} bougies chargées.</div>}
        </div>
      </>}
    </div>
  );
}
