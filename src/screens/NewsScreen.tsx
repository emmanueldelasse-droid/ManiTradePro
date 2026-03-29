import { useQuery } from "@tanstack/react-query";
import { marketApi } from "../services/marketApi";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";

export function NewsScreen() {
  const query = useQuery({ queryKey: ["news"], queryFn: () => marketApi.getNews() });
  if (query.isLoading) return <div className="screen"><LoadingState /></div>;
  const items = query.data?.data ?? [];
  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">News</div><div className="screen-subtitle">Articles réels uniquement</div></div>
      {items.length === 0 ? <EmptyState title="Aucune news" description={query.data?.message ?? "Source temporairement inaccessible."} /> : <div className="pf-history-list">{items.map((item)=><a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="pf-history-row"><div><div className="alert-row-title">{item.title}</div><div className="alert-row-desc">{item.source} · {item.publishedAt ? new Date(item.publishedAt).toLocaleString("fr-FR") : "date indisponible"}</div></div></a>)}</div>}
    </div>
  );
}
