import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Section from "../components/Section";
import OfficeFilter from "../components/OfficeFilter";
import { useStore } from "../store";

function toDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function Forecast() {
  const { scopedItems, scopedAdjustments, settings } = useStore();
  const [showReorderHistory, setShowReorderHistory] = useState(true);

  const weeklyUsageByItem = useMemo(() => {
    const result = new Map<string, number>();
    const now = new Date();
    const lookback = new Date();
    lookback.setDate(now.getDate() - 56); // 8 weeks

    for (const a of scopedAdjustments) {
      if (a.quantity >= 0) continue;
      const d = toDate(a.date);
      if (d < lookback) continue;
      result.set(a.itemId, (result.get(a.itemId) ?? 0) + Math.abs(a.quantity));
    }

    for (const [k, v] of result.entries()) {
      result.set(k, Number((v / 8).toFixed(2))); // weekly average
    }
    return result;
  }, [scopedAdjustments]);

  const forecastRows = useMemo(() => {
    return scopedItems.map(item => {
      const weeklyUsage = weeklyUsageByItem.get(item.id) ?? Number((item.avgDailyUsage * 7).toFixed(2));
      const dailyUsage = weeklyUsage / 7;
      const daysUntilReorderPoint = dailyUsage > 0 ? Math.max(0, Math.floor((item.qty - item.reorderPoint) / dailyUsage)) : Infinity;
      const leadAndBuffer = settings.shippingLeadTimeDays + settings.shippingBufferDays;
      const recommendedOrderIn = daysUntilReorderPoint === Infinity ? Infinity : Math.max(0, daysUntilReorderPoint - leadAndBuffer);
      const suggestedQty = Math.max(0, Math.ceil(item.maxLevel - item.qty));

      const status =
        recommendedOrderIn === Infinity ? "Stable" :
        recommendedOrderIn <= 0 ? "Order Now" :
        recommendedOrderIn <= 7 ? "Order This Week" : "Monitor";

      return {
        id: item.id,
        item: item.name,
        office: item.office,
        current: item.qty,
        reorderPoint: item.reorderPoint,
        weeklyUsage,
        daysUntilReorderPoint,
        recommendedOrderIn,
        suggestedQty,
        status
      };
    }).sort((a, b) => {
      const av = a.recommendedOrderIn === Infinity ? Number.MAX_SAFE_INTEGER : a.recommendedOrderIn;
      const bv = b.recommendedOrderIn === Infinity ? Number.MAX_SAFE_INTEGER : b.recommendedOrderIn;
      return av - bv;
    });
  }, [scopedItems, weeklyUsageByItem, settings.shippingLeadTimeDays, settings.shippingBufferDays]);

  const timelineData = useMemo(() => {
    return forecastRows
      .filter(r => r.recommendedOrderIn !== Infinity)
      .slice(0, 8)
      .map(r => ({ item: r.item, orderIn: r.recommendedOrderIn, weeklyUsage: r.weeklyUsage }));
  }, [forecastRows]);

  const reorderHistory = useMemo(() => {
    return scopedAdjustments
      .filter(a => a.type === "Add")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 25);
  }, [scopedAdjustments]);

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Reorder Forecast</div>
          <div className="sub">Predict reorder timing from weekly usage + shipping turnover settings</div>
        </div>
        <OfficeFilter />
      </div>

      <div className="grid-3" style={{ marginBottom: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Order Now</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{forecastRows.filter(r => r.status === "Order Now").length}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Order This Week</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{forecastRows.filter(r => r.status === "Order This Week").length}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Lead+Buffer Window</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{settings.shippingLeadTimeDays + settings.shippingBufferDays}d</div>
        </div>
      </div>

      <Section title="Reorder Timeline" subtitle="Items with nearest reorder dates">
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f9cff" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#4f9cff" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" opacity={0.25} />
              <XAxis dataKey="item" hide />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="orderIn" stroke="#4f9cff" fill="url(#forecastGrad)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div style={{ marginTop: 12 }}>
        <Section title="Forecast Details" subtitle="Recommended reorder timing and quantity by item">
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Office</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Current</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Weekly Usage</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Reorder Point</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Order In</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Suggested Qty</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {forecastRows.map(r => (
                <tr key={r.id}>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 700 }}>{r.item}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{r.office}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.current}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.weeklyUsage}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.reorderPoint}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.recommendedOrderIn === Infinity ? "N/A" : `${r.recommendedOrderIn}d`}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{r.suggestedQty}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>
                    <span className={`pill ${r.status === "Order Now" ? "danger" : r.status === "Order This Week" ? "warn" : "neutral"}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section
          title="Reorder History"
          subtitle="What was reordered and when"
          right={<button type="button" className="btn-pill" onClick={() => setShowReorderHistory(v => !v)}>{showReorderHistory ? "Hide" : "Show"}</button>}
        >
          {showReorderHistory && (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>When</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Office</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Qty Reordered</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {reorderHistory.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{new Date(r.createdAt).toLocaleString()}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 700 }}>{r.itemName}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{r.office}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>+{Math.abs(r.quantity)}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{r.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
