import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import KpiCard from "../components/KpiCard";
import Section from "../components/Section";
import { useStore } from "../store";
import OfficeFilter from "../components/OfficeFilter";

export default function Alerts() {
  const locationState = useLocation();
  const { scopedAlerts, acknowledgeAlert, acknowledgeAll } = useStore();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = scopedAlerts.length;
    const critical = scopedAlerts.filter(a => a.type === "Critical").length;
    const low = scopedAlerts.filter(a => a.type === "LowStock").length;
    const unack = scopedAlerts.filter(a => !a.acknowledged).length;
    return { total, critical, low, unack };
  }, [scopedAlerts]);

  useEffect(() => {
    const focusId = new URLSearchParams(locationState.search).get("focus");
    if (!focusId) return;
    setHighlightId(focusId);
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [locationState.search]);

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Alerts</div>
          <div className="sub">Monitor inventory alerts and notifications</div>
        </div>
        <OfficeFilter />
        <button onClick={acknowledgeAll} className="btn-accent" style={{ background:"#fff", color:"var(--accent)", border:"1px solid var(--border)" }}>
          Acknowledge All
        </button>
      </div>

      <div className="grid-4" style={{ marginBottom: 12 }}>
        <KpiCard title="Total Alerts" value={stats.total} />
        <KpiCard title="Critical" value={stats.critical} />
        <KpiCard title="Low Stock" value={stats.low} />
        <KpiCard title="Unacknowledged" value={stats.unack} />
      </div>

      <Section title="Active Alerts" subtitle={`${scopedAlerts.length} alerts`}>
        <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
          {scopedAlerts.map(a => (
            <div key={a.id} className={`card ${highlightId === a.id ? "temp-highlight" : ""}`} style={{ padding: 14, borderRadius: 14, boxShadow:"none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap: 12, alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{a.message}</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className={`pill ${a.type === "OutOfStock" || a.type === "Critical" ? "danger" : "warn"}`}>{a.type}</span>
                    <span className="pill neutral">{a.priority} Priority</span>
                    <span className="pill neutral">{a.location}</span>
                    <span style={{ fontSize: 12, color:"var(--muted)" }}>{a.category} • {a.office}</span>
                  </div>
                </div>
                <div className="row">
                  <button
                    onClick={() => acknowledgeAlert(a.id)}
                    style={{ height: 32, borderRadius: 10, border:"1px solid var(--border)", background:"#fff", cursor:"pointer", padding:"0 10px" }}
                  >
                    {a.acknowledged ? "Acknowledged" : "Acknowledge"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
