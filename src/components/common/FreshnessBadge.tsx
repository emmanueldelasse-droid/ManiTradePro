import type { FreshnessLevel } from "../../types/api";

export function FreshnessBadge({ freshness, source, asOf }: { freshness: FreshnessLevel; source?: string | null; asOf?: string | null }) {
  const map: Record<FreshnessLevel, string> = { live: "Live", recent: "Récent", stale: "Retardé", unknown: "Inconnu" };
  return <span className="indicator-chip">{map[freshness]}{source ? ` · ${source}` : ""}{asOf ? ` · ${new Date(asOf).toLocaleTimeString("fr-FR")}` : ""}</span>;
}
