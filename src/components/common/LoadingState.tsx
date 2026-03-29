export function LoadingState({ title = "Chargement..." }: { title?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⏳</div>
      <div className="empty-title">{title}</div>
    </div>
  );
}
