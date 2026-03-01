import { useMemo } from "react";
import { WarningRegular, ErrorCircleRegular, CubeRegular } from "@fluentui/react-icons";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import KpiCard from "../components/KpiCard";
import Section from "../components/Section";
import StatusPill, { statusForItem } from "../components/StatusPill";
import { useStore } from "../store";
import OfficeFilter from "../components/OfficeFilter";

export default function Overview() {
  const { scopedItems, settings } = useStore();

  const totals = useMemo(() => {
    const total = scopedItems.length;
    const low = scopedItems.filter(i => i.qty > 0 && i.qty <= i.lowStockLevel).length;
    const out = scopedItems.filter(i => i.qty === 0).length;
    return { total, low, out };
  }, [scopedItems]);

  const summaryItems = useMemo(() => {
    const limit = Math.max(1, settings.summaryWatchLimit || 5);
    return scopedItems
      .filter(i => i.top5)
      .sort((a, b) => statusForItem(a).localeCompare(statusForItem(b)))
      .slice(0, limit);
  }, [scopedItems, settings.summaryWatchLimit]);

  const top5 = useMemo(() => {
    return scopedItems
      .filter(i => i.qty <= i.lowStockLevel)
      .sort((a, b) => {
        const aSeverity = a.qty === 0 ? 0 : a.qty <= a.criticalLevel ? 1 : 2;
        const bSeverity = b.qty === 0 ? 0 : b.qty <= b.criticalLevel ? 1 : 2;
        if (aSeverity !== bSeverity) return aSeverity - bSeverity;
        return a.qty - b.qty;
      })
      .slice(0, 5);
  }, [scopedItems]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of scopedItems) m.set(i.category, (m.get(i.category) ?? 0) + 1);
    return Array.from(m.entries()).map(([category, count]) => ({ category, count }));
  }, [scopedItems]);

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Inventory Overview</div>
          <div className="sub">Monitor stock levels and manage inventory</div>
        </div>

        <OfficeFilter />
      </div>

      <div className="grid-3" style={{ marginBottom: 12 }}>
        <KpiCard title="Total Items" value={totals.total} icon={<CubeRegular />} />
        <KpiCard title="Low Stock" value={totals.low} icon={<WarningRegular />} />
        <KpiCard title="Out of Stock" value={totals.out} icon={<ErrorCircleRegular />} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Section title="Top 5 Items Needing Attention" subtitle="Priority items based on stock levels and thresholds">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Priority</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Item Name</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Category</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Location</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Qty</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {top5.map(i => {
                const kind = statusForItem(i);
                const reason = i.qty === 0 ? "Out of Stock" : (i.qty <= i.criticalLevel ? "Critical Level" : "Low Stock");
                const pr = i.qty === 0 || i.qty <= i.criticalLevel ? "Critical" : "High";
                return (
                  <tr key={i.id}>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>
                      <span className={`pill ${kind === "danger" ? "danger" : "warn"}`}>{pr}</span>
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", fontWeight: 650 }}>{i.name}</td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.category}</td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.location}</td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: kind === "danger" ? "var(--accent)" : "inherit", fontWeight: 700 }}>{i.qty}</span>
                      <span style={{ color: "var(--muted)" }}> / {i.lowStockLevel}</span>
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>
                      <span className={`pill ${kind === "danger" ? "danger" : "warn"}`}>{reason}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section title="Distribution by Category" subtitle="Items grouped by category type">
          <div style={{ height: 220, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={34} paddingAngle={2}>
                  {byCategory.map((row, idx) => (
                    <Cell key={row.category} fill={["#e63946", "#2a9d8f", "#ffb703", "#3a86ff", "#8338ec", "#fb5607", "#06d6a0"][idx % 7]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", alignContent: "center", gap: 6 }}>
              {byCategory.map((row, idx) => (
                <div key={row.category} className="row" style={{ gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: ["#e63946", "#2a9d8f", "#ffb703", "#3a86ff", "#8338ec", "#fb5607", "#06d6a0"][idx % 7], display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{row.category}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700 }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section title="Inventory Summary" subtitle={`${summaryItems.length}/${Math.max(1, settings.summaryWatchLimit || 5)} starred items`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Item Name</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Category</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Qty</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {summaryItems.map(i => (
                <tr key={i.id}>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", fontWeight: 650 }}>{i.name}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.category}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>{i.qty}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}><StatusPill item={i} /></td>
                </tr>
              ))}
              {summaryItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "12px 6px", color: "var(--muted)" }}>No starred items yet. Use the ⭐ column in Inventory to add items to this summary.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
