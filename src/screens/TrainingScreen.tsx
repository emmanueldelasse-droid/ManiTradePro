import { EmptyState } from "../components/common/EmptyState";

export function TrainingScreen() {
  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">Entraînement</div><div className="screen-subtitle">Séparé du réel</div></div>
      <EmptyState title="Module entraînement séparé" description="À brancher plus tard si tu veux, sans jamais polluer le portefeuille réel." />
    </div>
  );
}
