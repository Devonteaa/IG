export default function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent:"space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 2 }}>{subtitle}</div> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
