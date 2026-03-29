export function ErrorState({ title = "Source temporairement inaccessible", description = "Réessaie plus tard." }: { title?: string; description?: string }) {
  return (
    <div className="warning-box danger">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div>{description}</div>
    </div>
  );
}
