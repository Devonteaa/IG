import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Legend, CartesianGrid } from "recharts";
import KpiCard from "../components/KpiCard";
import Section from "../components/Section";
import { useStore } from "../store";
import OfficeFilter from "../components/OfficeFilter";

export default function Trends() {
  const { scopedItems, scopedAdjustments, settings } = useStore();
  const [range, setRange] = useState("Last 30 days");

  const filteredItems = useMemo(() => {
    if (settings.includeTrackedInAnalytics) return scopedItems;
    return scopedItems.filter(i => i.category !== "Tracked Equipment");
  }, [scopedItems, settings.includeTrackedInAnalytics]);

  const allowedIds = useMemo(() => new Set(filteredItems.map(i => i.id)), [filteredItems]);

  const filteredAdjustments = useMemo(() => {
    if (settings.includeTrackedInAnalytics) return scopedAdjustments;
    return scopedAdjustments.filter(a => allowedIds.has(a.itemId));
  }, [scopedAdjustments, allowedIds, settings.includeTrackedInAnalytics]);

  const series = useMemo(() => {
    const byDate = new Map<string, { day: string; inbound: number; outbound: number; usage: number; avg: number }>();

    for (const a of filteredAdjustments) {
      const day = a.date;
      if (!byDate.has(day)) {
        byDate.set(day, { day, inbound: 0, outbound: 0, usage: 0, avg: 0 });
      }
      const row = byDate.get(day)!;
      if (a.quantity > 0) {
        row.inbound += a.quantity;
      } else {
        const amount = Math.abs(a.quantity);
        row.outbound += amount;
        row.usage += amount;
      }
    }

    const days = range === "Last 90 days" ? 90 : range === "Last 60 days" ? 60 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = Array.from(byDate.values())
      .filter(r => {
        const d = new Date(r.day);
        return Number.isNaN(d.getTime()) ? true : d >= cutoff;
      })
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

    const avg = rows.length ? rows.reduce((sum, r) => sum + r.usage, 0) / rows.length : 0;
    const withAvg = rows.map(r => ({ ...r, avg: Number(avg.toFixed(2)) }));

    if (withAvg.length) return withAvg;
    return [{ day: new Date().toLocaleDateString(), inbound: 0, outbound: 0, usage: 0, avg: 0 }];
  }, [filteredAdjustments, range]);

  const totals = useMemo(() => {
    const inbound = series.reduce((s, r) => s + r.inbound, 0);
    const outbound = series.reduce((s, r) => s + r.outbound, 0);
    const net = inbound - outbound;
    const avg = series.length ? Number((series.reduce((s, r) => s + r.usage, 0) / series.length).toFixed(2)) : 0;
    return { inbound, outbound, net, avg };
  }, [series]);

  const itemLevel = useMemo(() => {
    const usageByItem = new Map<string, number>();
    for (const a of filteredAdjustments) {
      if (a.quantity < 0) {
        usageByItem.set(a.itemId, (usageByItem.get(a.itemId) ?? 0) + Math.abs(a.quantity));
      }
    }

    return filteredItems.map(i => {
      const usage30 = usageByItem.get(i.id) ?? 0;
      const avgDay = Number((usage30 / 30).toFixed(2));
      return {
        item: i.name,
        category: i.category,
        current: i.qty,
        usage: usage30,
        avgDay,
        trend: avgDay > 0.2 || i.qty === 0 ? "Depleting" : "Stable",
        daysLeft: avgDay > 0 ? Math.round(i.qty / avgDay) : Infinity
      };
    });
  }, [filteredItems, filteredAdjustments]);

  const trendHealth = useMemo(() => {
    const depletingCount = itemLevel.filter(i => i.trend === "Depleting").length;
    const avgDaysLeft = itemLevel.length
      ? Math.round(itemLevel.reduce((sum, i) => sum + (i.daysLeft === Infinity ? 90 : i.daysLeft), 0) / itemLevel.length)
      : 0;
    const usageVolatility = series.length
      ? Number((Math.max(...series.map(s => s.usage)) - Math.min(...series.map(s => s.usage))).toFixed(2))
      : 0;
    return { depletingCount, avgDaysLeft, usageVolatility };
  }, [itemLevel, series]);

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Inventory Trends</div>
          <div className="sub">Analyze movement patterns, usage trends, and demand forecasts</div>
        </div>
        <div className="row" style={{ justifyContent:"flex-end" }}>
          <OfficeFilter />
          <select value={range} onChange={(e)=>setRange(e.target.value)} style={{ height: 36, borderRadius: 10, border: "1px solid var(--border)", padding: "0 10px", background:"var(--panel-soft)" }}>
            {["Last 30 days","Last 60 days","Last 90 days"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 12 }}>
        <KpiCard title="Depleting Items" value={trendHealth.depletingCount} />
        <KpiCard title="Avg Days of Cover" value={`${trendHealth.avgDaysLeft}d`} />
        <KpiCard title="Usage Volatility" value={trendHealth.usageVolatility} />
      </div>

      <div className="grid-4" style={{ marginBottom: 12 }}>
        <KpiCard title="Total Inbound" value={totals.inbound} />
        <KpiCard title="Total Outbound" value={totals.outbound} />
        <KpiCard title="Net Change" value={`+${totals.net}`} />
        <KpiCard title="Avg Daily Usage" value={totals.avg} />
      </div>

      <div className="grid-2">
        <Section title="Inventory Movement" subtitle="Inbound vs outbound by day">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <defs>
                  <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#59b6ff" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#2f80ed" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff97a7" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e45770" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inbound" name="Inbound" fill="url(#inboundGrad)" radius={[8, 8, 0, 0]} animationDuration={700} />
                <Bar dataKey="outbound" name="Outbound" fill="url(#outboundGrad)" radius={[8, 8, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Usage Trend" subtitle="Daily consumption pattern with average">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="4 4" opacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="usage" name="Daily Usage" dot={false} stroke="#f6b44b" strokeWidth={3} />
                <Line type="monotone" dataKey="avg" name="Average" dot={false} stroke="#9ec5ff" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section title="Item-Level Trends" subtitle="Individual item performance and projections">
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Category</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Current</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Usage</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Avg/Day</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Trend</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>Days Left</th>
              </tr>
            </thead>
            <tbody>
              {itemLevel.map(r => (
                <tr key={r.item}>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 650 }}>{r.item}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{r.category}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.current}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.usage}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.avgDay}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>
                    <span className={`pill ${r.trend === "Depleting" ? "danger" : "neutral"}`}>{r.trend}</span>
                  </td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>{r.daysLeft === Infinity ? "∞" : `${r.daysLeft}d`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
