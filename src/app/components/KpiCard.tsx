export default function KpiCard({ title, value, icon }: { title: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 16, display:"flex", alignItems:"center", gap:12, minHeight: 64 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 12,
        background: "var(--accent-weak)", color:"var(--accent)",
        display:"grid", placeItems:"center"
      }}>
        {icon ?? "•"}
      </div>
      <div>
        <div style={{ fontSize: 12, color:"var(--muted)" }}>{title}</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}
