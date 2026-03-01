import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Section from "../components/Section";
import { useStore } from "../store";
import OfficeFilter from "../components/OfficeFilter";
import { statusForItem } from "../components/StatusPill";

export default function Reports() {
  const { scopedItems, scopedAdjustments, settings } = useStore();

  const filteredItems = useMemo(() => {
    if (settings.includeTrackedInAnalytics) return scopedItems;
    return scopedItems.filter(i => i.category !== "Tracked Equipment");
  }, [scopedItems, settings.includeTrackedInAnalytics]);

  const allowedIds = useMemo(() => new Set(filteredItems.map(i => i.id)), [filteredItems]);

  const filteredAdjustments = useMemo(() => {
    if (settings.includeTrackedInAnalytics) return scopedAdjustments;
    return scopedAdjustments.filter(a => allowedIds.has(a.itemId));
  }, [scopedAdjustments, allowedIds, settings.includeTrackedInAnalytics]);

  const statusDist = useMemo(() => {
    const m = new Map<string, number>([["InStock",0],["LowStock",0],["OutOfStock",0],["Retired",0]]);
    for (const i of filteredItems) {
      const s = i.qty === 0 ? "OutOfStock" : (i.qty <= i.lowStockLevel ? "LowStock" : "InStock");
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([status, count]) => ({ status, count }));
  }, [filteredItems]);

  const trend = useMemo(() => {
    const byDate = new Map<string, { date: string; additions: number; removals: number }>();
    for (const a of filteredAdjustments) {
      const key = a.date;
      if (!byDate.has(key)) byDate.set(key, { date: key, additions: 0, removals: 0 });
      const row = byDate.get(key)!;
      if (a.quantity > 0) row.additions += a.quantity;
      else row.removals += Math.abs(a.quantity);
    }
    return Array.from(byDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-8);
  }, [filteredAdjustments]);

  const usageSummary = useMemo(() => {
    const totalAdded = trend.reduce((s, r) => s + r.additions, 0);
    const totalUsed = trend.reduce((s, r) => s + r.removals, 0);
    const avgDailyUsage = trend.length ? Number((totalUsed / trend.length).toFixed(2)) : 0;
    return { totalAdded, totalUsed, avgDailyUsage };
  }, [trend]);

  const criticalItems = useMemo(() => filteredItems.filter(i => statusForItem(i) !== "success"), [filteredItems]);

  const exportCsv = () => {
    const header = ["Item Name","Category","Location","Available","LowStockLevel","Status"];
    const rows = criticalItems.map(i => {
      const status = i.qty === 0 ? "OutOfStock" : (i.qty <= i.lowStockLevel ? "LowStock" : "InStock");
      return [i.name, i.category, i.location, String(i.qty), String(i.lowStockLevel), status];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "critical-items.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const header = ["Item Name","Category","Location","Available","LowStockLevel","Status"];
    const rows = criticalItems.map(i => {
      const status = i.qty === 0 ? "OutOfStock" : (i.qty <= i.lowStockLevel ? "LowStock" : "InStock");
      return [i.name, i.category, i.location, String(i.qty), String(i.lowStockLevel), status];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "critical-items.xls";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Inventory Reports</div>
          <div className="sub">Run reports, review inventory health, and send alerts</div>
        </div>
        <OfficeFilter />
        <button className="btn-accent" style={{ background:"var(--panel-soft)", color:"var(--accent)", border:"1px solid var(--border)" }}>Send Alerts</button>
      </div>

      <Section title="Run Reports" subtitle="Generate on-demand inventory reports using per-location thresholds">
        <div className="grid-4">
          {[
            { t:"Low Stock Report", s:"Items below threshold" },
            { t:"Critical Items", s:"Immediate action needed" },
            { t:"Reorder Recommendations", s:"Items to restock" },
            { t:"Health Summary", s:"Overall inventory status" }
          ].map(x => (
            <div key={x.t} className="card" style={{ padding: 14, boxShadow:"none" }}>
              <div style={{ fontWeight: 800 }}>{x.t}</div>
              <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 4 }}>{x.s}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid-3" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Added (period)</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{usageSummary.totalAdded}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Used (period)</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{usageSummary.totalUsed}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Avg Daily Usage</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{usageSummary.avgDailyUsage}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Stock Adjustments Trend" subtitle="Additions vs removals by day">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <defs>
                  <linearGradient id="addGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f9cff" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#2f80ed" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="removeGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8b9c" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#e45770" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="additions" name="Additions" fill="url(#addGlow)" radius={[8, 8, 0, 0]} animationDuration={700} />
                <Bar dataKey="removals" name="Removals" fill="url(#removeGlow)" radius={[8, 8, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Status Distribution" subtitle="Items grouped by current status">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDist} layout="vertical" margin={{ left: 20, right: 10 }}>
                <CartesianGrid strokeDasharray="4 4" opacity={0.2} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="status" width={90} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} animationDuration={800}>
                  {statusDist.map((row) => (
                    <Cell
                      key={row.status}
                      fill={row.status === "OutOfStock" ? "#e45770" : row.status === "LowStock" ? "#f6b44b" : "#4f9cff"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section
          title="Critical Items"
          subtitle="Items requiring attention based on per-location thresholds"
          right={<div className="row"><button onClick={exportCsv} className="btn-pill">Export CSV</button><button onClick={exportExcel} className="btn-accent">Download Excel</button></div>}
        >
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item Name</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Category</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Location</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Available</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Total</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {criticalItems.map(i => {
                const status = i.qty === 0 ? "OutOfStock" : (i.qty <= i.lowStockLevel ? "LowStock" : "InStock");
                const pill = status === "OutOfStock" ? "danger" : "warn";
                return (
                  <tr key={i.id}>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 650 }}>{i.name}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{i.category}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{i.location}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{i.qty}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{i.maxLevel}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>
                      <span className={`pill ${pill}`}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
