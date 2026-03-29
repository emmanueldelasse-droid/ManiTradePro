import { apiGet } from "./apiClient";
import type { Candle, NewsItem, Opportunity, Quote } from "../types/market";
import type { PortfolioPosition, PortfolioSummary } from "../types/portfolio";

export const marketApi = {
  getQuotes(symbols: string[]) {
    return apiGet<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
  },
  getQuote(symbol: string) {
    return apiGet<Quote>(`/api/quotes/${encodeURIComponent(symbol)}`);
  },
  getCandles(symbol: string, timeframe = "1day", outputsize = 120) {
    return apiGet<Candle[]>(`/api/candles/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}&outputsize=${outputsize}`);
  },
  getOpportunities() {
    return apiGet<Opportunity[]>(`/api/opportunities`);
  },
  getNews() {
    return apiGet<NewsItem[]>(`/api/news`);
  },
  getFearGreed() {
    return apiGet<{ value: number; label: string }>(`/api/fear-greed`);
  },
  getTrending() {
    return apiGet<Array<{ symbol: string; name: string | null }>>(`/api/trending`);
  },
  getPortfolioSummary() {
    return apiGet<PortfolioSummary>(`/api/portfolio/summary`);
  },
  getPortfolioPositions() {
    return apiGet<PortfolioPosition[]>(`/api/portfolio/positions`);
  },
};
