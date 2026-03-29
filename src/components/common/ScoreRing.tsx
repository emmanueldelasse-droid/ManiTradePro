export function ScoreRing({ value }: { value: number | null }) {
  const display = value === null ? "—" : String(Math.round(value));
  return <div className="solid-badge">{display}</div>;
}
