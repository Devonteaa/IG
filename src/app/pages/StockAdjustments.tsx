import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Section from "../components/Section";
import { useStore } from "../store";
import { StockAdjustmentType } from "../types";
import OfficeFilter from "../components/OfficeFilter";

export default function StockAdjustments() {
  const locationState = useLocation();
  const { scopedItems, scopedAdjustments, addAdjustment, office } = useStore();
  const [itemId, setItemId] = useState(scopedItems[0]?.id ?? "");
  const [type, setType] = useState<StockAdjustmentType>("Add");
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const itemOptions = useMemo(() => scopedItems.map(i => ({ id: i.id, name: i.name })), [scopedItems]);

  useEffect(() => {
    if (!itemOptions.length) {
      setItemId("");
      return;
    }
    if (!itemOptions.some(o => o.id === itemId)) {
      setItemId(itemOptions[0].id);
    }
  }, [itemOptions, itemId]);

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
          <div className="h1">Stock Adjustments</div>
          <div className="sub">Record and track inventory quantity changes</div>
        </div>

        <OfficeFilter />

      </div>

      <Section title="Quick Adjustment" subtitle="Record a stock adjustment for an inventory item">
        <div className="grid-3">
          <div>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Select Item</div>
            <select value={itemId} onChange={(e)=>setItemId(e.target.value)} style={{ width:"100%", height: 36, borderRadius: 10, border:"1px solid var(--border)", padding:"0 10px", background:"#fff" }}>
              {itemOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Adjustment Type</div>
            <select value={type} onChange={(e)=>setType(e.target.value as StockAdjustmentType)} style={{ width:"100%", height: 36, borderRadius: 10, border:"1px solid var(--border)", padding:"0 10px", background:"#fff" }}>
              {["Add","Remove"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Quantity</div>
            <input value={qty} onChange={(e)=>setQty(Number(e.target.value))} type="number" min={0} className="search" style={{ width:"100%", maxWidth:"none" }} />
          </div>
        </div>

        <div style={{ marginTop: 10, display:"grid", gridTemplateColumns:"1fr 220px", gap: 12, alignItems:"end" }}>
          <div>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Reason (optional)</div>
            <input value={reason} onChange={(e)=>setReason(e.target.value)} className="search" style={{ width:"100%", maxWidth:"none" }} placeholder="e.g., New shipment received" />
          </div>
          <button
            className="btn-accent"
            style={{ height: 38 }}
            onClick={() => {
              if (!itemId || qty <= 0) return;
              const officeOverride = office === "All Offices" ? undefined : office;
              addAdjustment({ itemId, type, quantity: qty, reason, office: officeOverride });
              setQty(0);
              setReason("");
            }}
          >
            Submit
          </button>
        </div>
      </Section>

      <div style={{ marginTop: 12 }}>
        <Section title="Recent Adjustments" subtitle={`${scopedAdjustments.length} adjustments recorded`}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Date</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Timestamp</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item Name</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Type</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Quantity</th>
                <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {scopedAdjustments.slice(0, 15).map(a => (
                <tr key={a.id} className={highlightId === a.id ? "temp-highlight" : undefined}>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{a.date}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{new Date(a.createdAt).toLocaleString()}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 650 }}>{a.itemName}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>
                    <span className={`pill ${a.type === "Add" ? "success" : "danger"}`}>{a.type}</span>
                  </td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{a.quantity > 0 ? `+${a.quantity}` : a.quantity}</td>
                  <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{a.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
