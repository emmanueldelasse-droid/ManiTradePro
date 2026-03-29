export type AssetClass = "crypto" | "stock" | "forex" | "commodity" | "etf" | "unknown";

export type Quote = {
  symbol: string;
  name: string | null;
  assetClass: AssetClass;
  price: number;
  change24hPct: number | null;
  volume24h: number | null;
  currency: string;
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type Opportunity = {
  symbol: string;
  name: string | null;
  assetClass: AssetClass;
  price: number | null;
  change24hPct: number | null;
  direction: "long" | "short" | "neutral" | null;
  score: number | null;
  confidence: "high" | "medium" | "low" | "incomplete";
  analysisLabel: string;
  metrics: Record<string, number | null>;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  publishedAt: string | null;
  url: string;
  symbols: string[];
};
