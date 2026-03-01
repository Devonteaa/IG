import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { useStore } from "./store";

type AlertBanner = {
  id: string;
  message: string;
  type: "OutOfStock" | "Critical" | "LowStock" | "ReorderPoint";
  office: string;
};

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { globalSearch, setGlobalSearch, items, adjustments, alerts } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertBanners, setAlertBanners] = useState<AlertBanner[]>([]);
  const seenAlertIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const results = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [] as Array<{ id: string; targetId: string; title: string; meta: string; page: string; tab: string; route: string }>;

    const inventoryHits = items
      .filter(i => [i.id, i.name, i.category, i.location, i.office].some(v => String(v).toLowerCase().includes(q)))
      .map(i => {
        const tracked = i.category === "Tracked Equipment";
        return {
          id: `result-item-${i.id}`,
          targetId: i.id,
          title: i.name,
          meta: `${i.office} • ${i.location} • ${i.category}`,
          page: tracked ? "Tracked Equipment" : "Inventory",
          tab: tracked ? "Tracked Equipment" : "Inventory",
          route: tracked ? "/tracked-equipment" : "/inventory"
        };
      });

    const adjustmentHits = adjustments
      .filter(a => [a.id, a.itemName, a.reason, a.type, a.office, a.date].some(v => String(v ?? "").toLowerCase().includes(q)))
      .map(a => ({
        id: `result-adj-${a.id}`,
        targetId: a.id,
        title: `${a.itemName} (${a.type})`,
        meta: `${a.office} • ${a.date}${a.reason ? ` • ${a.reason}` : ""}`,
        page: "Stock Adjustments",
        tab: "Stock Adjustments",
        route: "/stock-adjustments"
      }));

    const alertHits = alerts
      .filter(a => [a.itemName, a.message, a.type, a.category, a.location, a.office].some(v => String(v).toLowerCase().includes(q)))
      .map(a => ({
        id: `result-alert-${a.id}`,
        targetId: a.id,
        title: a.message,
        meta: `${a.office} • ${a.location} • ${a.type}`,
        page: "Alerts",
        tab: "Alerts",
        route: "/alerts"
      }));

    return [...inventoryHits, ...adjustmentHits, ...alertHits].slice(0, 14);
  }, [globalSearch, items, adjustments, alerts]);

  useEffect(() => {
    if (!initializedRef.current) {
      seenAlertIdsRef.current = new Set(alerts.map(a => a.id));
      initializedRef.current = true;
      return;
    }

    const newAlerts = alerts.filter(a => !seenAlertIdsRef.current.has(a.id));
    if (!newAlerts.length) return;

    const nextBanners = newAlerts.map((a, idx) => ({
      id: `${a.id}-${Date.now()}-${idx}`,
      message: a.message,
      type: a.type,
      office: a.office
    }));

    setAlertBanners(prev => [...nextBanners, ...prev].slice(0, 5));

    nextBanners.forEach((banner) => {
      window.setTimeout(() => {
        setAlertBanners(prev => prev.filter(b => b.id !== banner.id));
      }, 4200);
    });

    newAlerts.forEach(a => seenAlertIdsRef.current.add(a.id));
  }, [alerts]);

  return (
    <div className="container">
      <div className="alert-banner-stack" aria-live="polite" aria-atomic="false">
        {alertBanners.map((banner) => (
          <div key={banner.id} className={`alert-banner alert-${banner.type.toLowerCase()}`}>
            <div className="alert-banner-title">New {banner.type} Alert</div>
            <div className="alert-banner-message">{banner.message}</div>
            <div className="alert-banner-meta">{banner.office}</div>
          </div>
        ))}
      </div>
      <div className="app-global-bar">
        <Sidebar />
        <div className="global-search-wrap">
          <input
            className="search app-global-search"
            placeholder="Search across all pages..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
          />

          {searchOpen && globalSearch.trim() && (
            <div className="search-results-popup">
              <div className="search-results-title">Results ({results.length})</div>
              {results.length === 0 && (
                <div className="search-result-empty">No matches found for "{globalSearch.trim()}".</div>
              )}
              {results.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className="search-result-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    navigate(`${r.route}?focus=${encodeURIComponent(r.targetId)}`);
                    setSearchOpen(false);
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.meta}</div>
                  <div className="search-result-meta">Page: {r.page} • Tab: {r.tab}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <main className="content">
        <div key={location.pathname} className="page-transition">
          <Outlet />
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", textAlign: "right", opacity: 0.85 }}>
            Crafted by DeVonte Anderson • devonteanderson@devonteanderson.com
          </div>
        </div>
      </main>
    </div>
  );
}
