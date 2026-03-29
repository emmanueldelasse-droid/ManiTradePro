export type PortfolioPosition = {
  id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  entryPrice: number;
  currentPrice: number | null;
  pnl: number | null;
  pnlPct: number | null;
  openedAt: string | null;
};

export type PortfolioSummary = {
  totalEquity: number | null;
  availableCash: number | null;
  totalPnl: number | null;
  totalPnlPct: number | null;
};

export type TrainingTrade = {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  quantity: number;
  createdAt: string;
};
