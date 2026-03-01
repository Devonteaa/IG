import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Section from "../components/Section";
import OfficeFilter from "../components/OfficeFilter";
import { useStore } from "../store";
import { InventoryItem } from "../types";

type TrackedDraft = {
  name: string;
  office: string;
  location: "Tracked Inventory" | "Main Inventory";
  qty: number;
};

export default function TrackedEquipment() {
  const locationState = useLocation();
  const { scopedItems, items, setItems, officeOptions, settings } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrackedDraft>({
    name: "",
    office: officeOptions.find(o => o !== "All Offices") ?? "Austin",
    location: "Tracked Inventory",
    qty: 1
  });

  const tracked = useMemo(
    () => scopedItems.filter(i => i.location === "Tracked Inventory"),
    [scopedItems]
  );

  useEffect(() => {
    const focusId = new URLSearchParams(locationState.search).get("focus");
    if (!focusId) return;
    setHighlightId(focusId);
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [locationState.search]);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;

    const maxId = items.reduce((mx, i) => {
      const n = Number(i.id.replace("item-", ""));
      return Number.isFinite(n) ? Math.max(mx, n) : mx;
    }, 0);

    const payload: InventoryItem = {
      id: `item-${maxId + 1}`,
      name: draft.name.trim(),
      category: "Tracked Equipment",
      office: draft.office,
      location: draft.location,
      qty: Math.max(0, Number(draft.qty) || 0),
      lowStockLevel: settings.defaultLowStockLevel,
      criticalLevel: settings.defaultCriticalLevel,
      maxLevel: settings.defaultMaxLevel,
      reorderPoint: settings.defaultReorderPoint,
      avgDailyUsage: 0,
      top5: false,
      updatedAt: new Date().toISOString()
    };

    setItems(prev => [...prev, payload]);
    setIsFormOpen(false);
    setDraft({
      name: "",
      office: officeOptions.find(o => o !== "All Offices") ?? "Austin",
      location: "Tracked Inventory",
      qty: 1
    });
  };

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Tracked Equipment</div>
          <div className="sub">Monitor conference and shared equipment separately</div>
        </div>
        <OfficeFilter />
        <button className="btn-accent" onClick={() => setIsFormOpen(true)}>+ Add Item</button>
      </div>

      <Section title="Tracked Assets" subtitle={`${tracked.length} items`}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Item</th>
              <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Office</th>
              <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Location</th>
              <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Qty</th>
              <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tracked.map(i => (
              <tr key={i.id} className={highlightId === i.id ? "temp-highlight" : undefined}>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", fontWeight: 650 }}>{i.name}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.office}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.location}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>{i.qty}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{new Date(i.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-card card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div className="h1" style={{ fontSize: 18 }}>Add Tracked Equipment</div>
                <div className="sub">Create a tracked equipment item.</div>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="btn-quiet">Close</button>
            </div>

            <form onSubmit={handleCreate} className="grid-2">
              <label className="form-field">
                <span>Item name</span>
                <input required value={draft.name} onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))} />
              </label>

              <label className="form-field">
                <span>Office</span>
                <select value={draft.office} onChange={(e) => setDraft(prev => ({ ...prev, office: e.target.value }))}>
                  {officeOptions.filter(o => o !== "All Offices").map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Location</span>
                <div className="row" style={{ gap: 8 }}>
                  {(["Tracked Inventory", "Main Inventory"] as const).map(loc => (
                    <button
                      key={loc}
                      type="button"
                      className="btn-pill"
                      onClick={() => setDraft(prev => ({ ...prev, location: loc }))}
                      style={{ borderColor: draft.location === loc ? "var(--accent)" : undefined }}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </label>

              <label className="form-field">
                <span>Quantity</span>
                <input type="number" min={0} value={draft.qty} onChange={(e) => setDraft(prev => ({ ...prev, qty: Number(e.target.value) }))} />
              </label>

              <div className="row" style={{ gridColumn: "1 / -1", justifyContent: "flex-end" }}>
                <button type="button" className="btn-quiet" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn-accent">Create Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
