import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Section from "../components/Section";
import StatusPill from "../components/StatusPill";
import { useStore } from "../store";
import OfficeFilter from "../components/OfficeFilter";
import { InventoryItem } from "../types";

type ItemDraft = {
  name: string;
  category: string;
  office: string;
  location: string;
  qty: number;
  lowStockLevel: number;
  criticalLevel: number;
  maxLevel: number;
  reorderPoint: number;
  top5: boolean;
};

const initialDraft: ItemDraft = {
  name: "",
  category: "Accessories",
  office: "Austin",
  location: "Main Storage",
  qty: 0,
  lowStockLevel: 10,
  criticalLevel: 5,
  maxLevel: 50,
  reorderPoint: 15,
  top5: false
};

const locationOptions = ["Main Inventory", "Tracked Inventory"] as const;

export default function Inventory() {
  const locationState = useLocation();
  const { items, scopedItems, setItems, officeOptions, settings, categories } = useStore();
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [breakdownOffice, setBreakdownOffice] = useState("All Offices");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(initialDraft);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [watchLimitNotice, setWatchLimitNotice] = useState<string>("");

  useEffect(() => {
    const focusId = new URLSearchParams(locationState.search).get("focus");
    if (!focusId) return;
    setHighlightId(focusId);
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [locationState.search]);

  const categoryOptions = useMemo(() => ["All", ...categories], [categories]);

  const filtered = useMemo(() => {
    return scopedItems.filter(i => {
      if (i.location === "Tracked Inventory") return false;
      if (category !== "All" && i.category !== category) return false;
      if (status !== "All") {
        const s =
          i.qty === 0 ? "OutOfStock" :
          (i.qty <= i.lowStockLevel ? "LowStock" : "InStock");
        if (s !== status) return false;
      }
      return true;
    });
  }, [scopedItems, category, status]);

  const officeBreakdown = useMemo(() => {
    const source = breakdownOffice === "All Offices"
      ? items
      : items.filter(i => i.office === breakdownOffice);

    const byOffice = new Map<string, { office: string; itemCount: number; totalQty: number; low: number; out: number }>();
    for (const i of source) {
      if (!byOffice.has(i.office)) {
        byOffice.set(i.office, { office: i.office, itemCount: 0, totalQty: 0, low: 0, out: 0 });
      }
      const row = byOffice.get(i.office)!;
      row.itemCount += 1;
      row.totalQty += i.qty;
      if (i.qty === 0) row.out += 1;
      else if (i.qty <= i.lowStockLevel) row.low += 1;
    }

    return Array.from(byOffice.values()).sort((a, b) => a.office.localeCompare(b.office));
  }, [items, breakdownOffice]);

  const topNeedAttention = useMemo(() => {
    return scopedItems
      .map(i => {
        const severity = i.qty === 0 ? 0 : i.qty <= i.criticalLevel ? 1 : i.qty <= i.lowStockLevel ? 2 : 3;
        const pressure = i.qty / Math.max(1, i.lowStockLevel);
        return { ...i, severity, pressure };
      })
      .filter(i => i.severity < 3)
      .sort((a, b) => (a.severity - b.severity) || (a.pressure - b.pressure))
      .slice(0, 5);
  }, [scopedItems]);

  const watchedCount = useMemo(() => items.filter(i => i.top5).length, [items]);

  const toggleSummaryStar = (id: string) => {
    const limit = Math.max(1, settings.summaryWatchLimit || 5);
    let hitLimit = false;

    setItems(prev => {
      const activeCount = prev.filter(i => i.top5).length;
      return prev.map(i => {
        if (i.id !== id) return i;
        if (!i.top5 && activeCount >= limit) {
          hitLimit = true;
          return i;
        }
        return { ...i, top5: !i.top5, updatedAt: new Date().toISOString() };
      });
    });

    if (hitLimit) {
      setWatchLimitNotice(`Summary limit reached (${limit}). Remove one or increase limit in Settings.`);
      window.setTimeout(() => setWatchLimitNotice(""), 2400);
    }
  };

  const bump = (id: string, delta: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i));
  };

  const startAdd = () => {
    setEditingId(null);
    setDraft({
      ...initialDraft,
      category: categories[0] ?? "General",
      office: officeOptions.find(o => o !== "All Offices") ?? "Austin",
      lowStockLevel: settings.defaultLowStockLevel,
      criticalLevel: settings.defaultCriticalLevel,
      reorderPoint: settings.defaultReorderPoint,
      maxLevel: settings.defaultMaxLevel
    });
    setIsFormOpen(true);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      category: item.category,
      office: item.office,
      location: locationOptions.includes(item.location as any) ? item.location : "Main Inventory",
      qty: item.qty,
      lowStockLevel: item.lowStockLevel,
      criticalLevel: item.criticalLevel,
      maxLevel: item.maxLevel,
      reorderPoint: item.reorderPoint,
      top5: item.top5
    });
    setIsFormOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    if (!draft.name.trim()) return;

    const now = new Date().toISOString();
    const payload: Omit<InventoryItem, "id"> = {
      name: draft.name.trim(),
      category: draft.category.trim() || "General",
      office: draft.office,
      location: draft.location.trim() || "Main Inventory",
      qty: Math.max(0, Number(draft.qty) || 0),
      lowStockLevel: Math.max(0, Number(draft.lowStockLevel) || 0),
      criticalLevel: Math.max(0, Number(draft.criticalLevel) || 0),
      maxLevel: Math.max(1, Number(draft.maxLevel) || 1),
      reorderPoint: Math.max(0, Number(draft.reorderPoint) || 0),
      avgDailyUsage: 0,
      top5: draft.top5,
      updatedAt: now
    };

    const trackedByLocation = payload.location === "Tracked Inventory";
    payload.category = trackedByLocation ? "Tracked Equipment" : payload.category;

    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...payload } : i));
    } else {
      const maxId = items.reduce((mx, i) => {
        const n = Number(i.id.replace("item-", ""));
        return Number.isFinite(n) ? Math.max(mx, n) : mx;
      }, 0);
      setItems(prev => [...prev, { id: `item-${maxId + 1}`, ...payload }]);
    }

    setIsFormOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Inventory Management</div>
          <div className="sub">Add, edit, and manage inventory items</div>
        </div>

        <OfficeFilter />

        <button className="btn-accent" onClick={startAdd}>+ Add Item</button>
      </div>

      {!!watchLimitNotice && (
        <div style={{ marginBottom: 10 }}>
          <span className="pill warn">{watchLimitNotice}</span>
        </div>
      )}

      <Section
        title="All Items"
        subtitle={`${filtered.length} items`}
        right={
          <div className="row">
            <select value={category} onChange={(e)=>setCategory(e.target.value)} style={{ width: 160 }}>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={(e)=>setStatus(e.target.value)} style={{ width: 140 }}>
              {["All","InStock","LowStock","OutOfStock"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        }
      >
        <div className="inventory-table-wrap">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign:"left", color:"var(--muted)" }}>
              {settings.showItemId && <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>ID</th>}
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item Name</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Category</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Office</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Qty</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Last Updated</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Status</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>30d Forecast</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Summary ⭐ ({watchedCount}/{Math.max(1, settings.summaryWatchLimit || 5)})</th>
              <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className={highlightId === i.id ? "temp-highlight" : undefined}>
                {settings.showItemId && <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{i.id}</td>}
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 650 }}>{i.name}</td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{i.category}</td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{i.office}</td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{i.qty}</td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{new Date(i.updatedAt).toLocaleString()}</td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}><StatusPill item={i} /></td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>
                  <span className="pill neutral">≈ {Math.max(0, Math.round(i.qty - i.avgDailyUsage * 30))}</span>
                </td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>
                  <button type="button" className="inventory-action" style={{ padding: "0 8px" }} onClick={() => toggleSummaryStar(i.id)} title="Add/remove from overview summary">
                    {i.top5 ? "⭐" : "☆"}
                  </button>
                </td>
                <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>
                  <button onClick={() => bump(i.id, -1)} className="inventory-action">−</button>{" "}
                  <button onClick={() => bump(i.id, +1)} className="inventory-action">+</button>{" "}
                  <button onClick={() => startEdit(i)} className="inventory-action" style={{ padding:"0 10px" }}>✎</button>{" "}
                  <button onClick={() => removeItem(i.id)} className="inventory-action" style={{ padding:"0 10px" }}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Section>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section
          title="Inventory by Office"
          subtitle="Stock breakdown across office locations"
          right={
            <select value={breakdownOffice} onChange={(e) => setBreakdownOffice(e.target.value)} style={{ width: 180 }}>
              {officeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          }
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Office</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Items</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Total Qty</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Low Stock</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Out of Stock</th>
              </tr>
            </thead>
            <tbody>
              {officeBreakdown.map(r => (
                <tr key={r.office}>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", fontWeight: 650 }}>{r.office}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>{r.itemCount}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>{r.totalQty}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}><span className="pill warn">{r.low}</span></td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}><span className="pill danger">{r.out}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Top 5 Needs Attention" subtitle="Most urgent items based on stock thresholds">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Item</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Category</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Office</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Qty</th>
                <th style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>Alert</th>
              </tr>
            </thead>
            <tbody>
              {topNeedAttention.map(i => (
                <tr key={i.id}>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", fontWeight: 650 }}>{i.name}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.category}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{i.office}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>{i.qty}</td>
                  <td style={{ padding: "10px 6px", borderBottom: "1px solid var(--border)" }}>
                    <span className={`pill ${i.qty === 0 || i.qty <= i.criticalLevel ? "danger" : "warn"}`}>
                      {i.qty === 0 ? "Out of Stock" : i.qty <= i.criticalLevel ? "Critical" : "Low Stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-card card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div className="h1" style={{ fontSize: 18 }}>{editingId ? "Edit Inventory Item" : "Add Inventory Item"}</div>
                <div className="sub">Capture details to keep stock accurate.</div>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="btn-quiet">Close</button>
            </div>

            <form onSubmit={handleSave} className="grid-2">
              <label className="form-field">
                <span>Item name</span>
                <input required value={draft.name} onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))} />
              </label>

              <label className="form-field">
                <span>Category</span>
                <select value={draft.category} onChange={(e) => setDraft(prev => ({ ...prev, category: e.target.value }))}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
                  {locationOptions.map(loc => (
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

              <label className="form-field">
                <span>Low stock level</span>
                <input type="number" min={0} value={draft.lowStockLevel} onChange={(e) => setDraft(prev => ({ ...prev, lowStockLevel: Number(e.target.value) }))} />
              </label>

              <label className="form-field">
                <span>Critical level</span>
                <input type="number" min={0} value={draft.criticalLevel} onChange={(e) => setDraft(prev => ({ ...prev, criticalLevel: Number(e.target.value) }))} />
              </label>

              <label className="form-field">
                <span>Reorder point</span>
                <input type="number" min={0} value={draft.reorderPoint} onChange={(e) => setDraft(prev => ({ ...prev, reorderPoint: Number(e.target.value) }))} />
              </label>

              <label className="form-field">
                <span>Max level</span>
                <input type="number" min={1} value={draft.maxLevel} onChange={(e) => setDraft(prev => ({ ...prev, maxLevel: Number(e.target.value) }))} />
              </label>

              <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                <span>
                  <input
                    type="checkbox"
                    checked={draft.top5}
                    onChange={(e) => setDraft(prev => ({ ...prev, top5: e.target.checked }))}
                    style={{ marginRight: 8 }}
                  />
                  Mark as top-5 watched item
                </span>
              </label>

              <div className="row" style={{ gridColumn: "1 / -1", justifyContent: "flex-end" }}>
                <button type="button" className="btn-quiet" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn-accent">{editingId ? "Save Changes" : "Create Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
