import { useMemo, useState } from "react";
import Section from "../components/Section";
import { useStore } from "../store";

export default function Settings() {
  const { settings, setSettings, officeOptions, addOffice, removeOffice, categories, addCategory, removeCategory, changeLogs, setAlerts, acknowledgeAll, addAdjustment, items } = useStore();
  const [working, setWorking] = useState(settings);
  const [activeTab, setActiveTab] = useState<"Appearance" | "Inventory" | "Operations" | "Security" | "About">("Appearance");
  const [officeDraft, setOfficeDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [logFrom, setLogFrom] = useState<string>("");
  const [logTo, setLogTo] = useState<string>("");

  const save = () => setSettings(working);
  const reset = () => setWorking(settings);

  const isRed = useMemo(() => working.accent === "#b33a3a", [working.accent]);
  const preferredOffice = useMemo(
    () => officeOptions.find(o => o !== "All Offices") ?? "Austin",
    [officeOptions]
  );

  const filteredLogs = useMemo(() => {
    const toDate = logTo ? new Date(logTo) : new Date();
    toDate.setHours(23, 59, 59, 999);
    const fromDate = logFrom ? new Date(logFrom) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000;
    const safeFrom = (toDate.getTime() - fromDate.getTime()) > maxRangeMs
      ? new Date(toDate.getTime() - maxRangeMs)
      : fromDate;

    return changeLogs.filter(log => {
      const ts = new Date(log.timestamp).getTime();
      return ts >= safeFrom.getTime() && ts <= toDate.getTime();
    });
  }, [changeLogs, logFrom, logTo]);

  const printLogReport = () => {
    const rows = filteredLogs
      .map(l => `<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.office}</td><td>${l.itemName}</td><td>${l.action}</td><td>${l.details ?? ""}</td></tr>`)
      .join("");

    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.write(`
      <html><head><title>Inventory Change Log Report</title>
      <style>body{font-family:Arial;padding:16px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:8px;font-size:12px;text-align:left}</style>
      </head><body>
      <h2>Inventory Change Log Report</h2>
      <p>Rows: ${filteredLogs.length}</p>
      <table><thead><tr><th>Timestamp</th><th>Office</th><th>Item</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  const handleAddOffice = () => {
    if (!officeDraft.trim()) return;
    addOffice(officeDraft);
    setOfficeDraft("");
  };

  const handleAddCategory = () => {
    if (!categoryDraft.trim()) return;
    addCategory(categoryDraft);
    setCategoryDraft("");
  };

  const upsertOfficeThreshold = (
    officeName: string,
    patch: Partial<{ lowStockLevel: number; criticalLevel: number; reorderPoint: number; maxLevel: number }>
  ) => {
    setWorking(prev => {
      const existing = prev.officeThresholds.find(t => t.office === officeName);
      if (existing) {
        return {
          ...prev,
          officeThresholds: prev.officeThresholds.map(t => t.office === officeName ? { ...t, ...patch } : t)
        };
      }
      return {
        ...prev,
        officeThresholds: [
          ...prev.officeThresholds,
          {
            office: officeName,
            lowStockLevel: prev.defaultLowStockLevel,
            criticalLevel: prev.defaultCriticalLevel,
            reorderPoint: prev.defaultReorderPoint,
            maxLevel: prev.defaultMaxLevel,
            ...patch
          }
        ]
      };
    });
  };

  const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button
      type="button"
      className={`mac-toggle ${on ? "on" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
    />
  );

  const pushTestAlert = (type: "OutOfStock" | "Critical" | "LowStock") => {
    const timestamp = new Date().toISOString();
    setAlerts(prev => [{
      id: `al-test-${Math.random().toString(16).slice(2)}`,
      itemId: "item-test",
      itemName: "Test Item",
      category: "Testing",
      location: "qa-lab",
      office: preferredOffice,
      type,
      priority: type === "LowStock" ? "Medium" : "High",
      message:
        type === "OutOfStock"
          ? "Test alert: Item is out of stock"
          : type === "Critical"
            ? "Test alert: Item reached critical level"
            : "Test alert: Item is running low",
      acknowledged: false,
      createdAt: timestamp
    }, ...prev]);
  };

  const runTestAdjustment = () => {
    const target = items[0];
    if (!target) return;
    addAdjustment({
      itemId: target.id,
      type: "Remove",
      quantity: Math.max(1, working.quickAdjustmentStep),
      reason: "Settings test adjustment",
      office: target.office
    });
  };

  return (
    <div>
      <div className="topbar">
        <div style={{ minWidth: 260 }}>
          <div className="h1">Settings</div>
          <div className="sub">Configure app preferences and defaults</div>
        </div>

        <div className="row">
          <button onClick={reset} className="btn-pill">Reset</button>
          <button onClick={save} className="btn-accent" style={{ opacity: isRed ? 1 : 0.95 }}>Save Changes</button>
        </div>
      </div>

      <div className="settings-tabs">
        {(["Appearance", "Inventory", "Operations", "Security", "About"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            className={`settings-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Appearance" && (
        <>
      <Section title="Theme & Branding" subtitle="Customize the app's accent color and appearance">
        <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 10 }}>Accent Color Wheel</div>
        <div className="theme-wheel-wrap">
          <div className="theme-wheel" />
          <input
            type="color"
            value={working.accent}
            onChange={(e) => {
              const next = e.target.value;
              setWorking(prev => ({ ...prev, accent: next }));
              document.documentElement.style.setProperty("--accent", next);
              document.documentElement.style.setProperty("--accent-weak", `${next}22`);
            }}
            className="theme-wheel-input"
            aria-label="Pick accent color"
          />
          <div className="theme-wheel-dot" style={{ background: working.accent }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>{working.accent.toUpperCase()}</div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Appearance</div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setWorking(prev => ({ ...prev, themeMode: "light" }))}
              style={{ borderColor: working.themeMode === "light" ? "var(--accent)" : undefined }}
            >
              ☀ Light
            </button>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setWorking(prev => ({ ...prev, themeMode: "dark" }))}
              style={{ borderColor: working.themeMode === "dark" ? "var(--accent)" : undefined }}
            >
              🌙 Dark
            </button>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setWorking(prev => ({ ...prev, densityMode: "comfortable" }))}
              style={{ borderColor: working.densityMode === "comfortable" ? "var(--accent)" : undefined }}
            >
              Comfortable
            </button>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setWorking(prev => ({ ...prev, densityMode: "compact" }))}
              style={{ borderColor: working.densityMode === "compact" ? "var(--accent)" : undefined }}
            >
              Compact
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Preview</div>
          <div className="row">
            <button className="btn-accent">Primary Button</button>
            <button className="btn-pill">Secondary</button>
            <span className="pill neutral">Outline</span>
            <span className="pill danger">Badge</span>
            <span className="pill neutral">Outline Badge</span>
            <span style={{ fontWeight: 800, color:"var(--accent)" }}>Primary Text</span>
          </div>
        </div>

        <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Include Tracked Equipment in Trends/Reports</div>
            <div style={{ fontSize: 12, color:"var(--muted)" }}>Toggle whether tracked-only assets are included in analytics and exports</div>
          </div>
          <Toggle on={working.includeTrackedInAnalytics} onClick={() => setWorking(p => ({ ...p, includeTrackedInAnalytics: !p.includeTrackedInAnalytics }))} label="Include tracked in analytics" />
        </div>
      </Section>

      <div style={{ marginTop: 12 }}>
        <Section title="Admin Access Controls" subtitle="Secure settings management without hardcoded credentials">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Enable Secure Settings Access</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Require configured admin credentials for settings changes</div>
            </div>
            <Toggle on={working.secureSettingsEnabled} onClick={() => setWorking(p => ({ ...p, secureSettingsEnabled: !p.secureSettingsEnabled }))} label="Enable secure settings access" />
          </div>

          <div className="grid-2" style={{ marginTop: 12 }}>
            <label className="form-field">
              <span>Admin Email</span>
              <input
                type="email"
                value={working.adminEmail}
                onChange={(e)=>setWorking(p => ({ ...p, adminEmail: e.target.value }))}
                placeholder="admin@company.com"
              />
            </label>
            <label className="form-field">
              <span>Settings Access Key</span>
              <input
                type="password"
                value={working.settingsAccessKey}
                onChange={(e)=>setWorking(p => ({ ...p, settingsAccessKey: e.target.value }))}
                placeholder="Create a strong access key"
              />
            </label>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color:"var(--muted)" }}>
            Access key is editable and never hardcoded. Rotate it any time from this panel.
          </div>
        </Section>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Display Settings" subtitle="Customize how data is displayed">
          <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Date Format</div>
          <input value={working.dateFormat} onChange={(e)=>setWorking(p=>({ ...p, dateFormat: e.target.value as any }))} placeholder="MM/DD/YYYY" />

          <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 12, marginBottom: 6 }}>Timezone</div>
          <select value={working.timezone} onChange={(e)=>setWorking(p=>({ ...p, timezone: e.target.value }))}>
            {["America/Chicago", "America/New_York", "America/Los_Angeles", "UTC"].map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>

          <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 12, marginBottom: 6 }}>Currency</div>
          <select value={working.currencyCode} onChange={(e)=>setWorking(p=>({ ...p, currencyCode: e.target.value as any }))}>
            {["USD", "EUR", "GBP", "CAD"].map(ccy => (
              <option key={ccy} value={ccy}>{ccy}</option>
            ))}
          </select>
        </Section>
      </div>
        </>
      )}

      {activeTab === "Operations" && (
        <>
      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Auto-Reorder Settings" subtitle="Configure automatic reorder behavior">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Enable Auto-Reorder</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Automatically flags items for reorder when below threshold</div>
            </div>
            <Toggle on={working.autoReorderEnabled} onClick={() => setWorking(p=>({ ...p, autoReorderEnabled: !p.autoReorderEnabled }))} label="Enable Auto-Reorder" />
          </div>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Reorder to Optimal Level</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Target optimal stock level when reordering</div>
            </div>
            <Toggle on={working.reorderToOptimal} onClick={() => setWorking(p=>({ ...p, reorderToOptimal: !p.reorderToOptimal }))} label="Reorder to Optimal Level" />
          </div>

        </Section>

        <Section title="Alert Notifications" subtitle="Configure alert and notification preferences">
          {[
            ["Enable Notifications","Allow the app to show notifications","notificationsEnabled"],
            ["Critical Level Alerts","Alert when items reach critical level","notifyCritical"],
            ["Low Stock Alerts","Get notified when items reach low stock threshold","notifyLow"],
            ["Out of Stock Alerts","Get notified when items are out of stock","notifyOut"],
            ["Reorder Point Alerts","Alert when items reach reorder point","notifyReorder"]
          ].map(([t, s, k]) => (
            <div key={k} className="row" style={{ justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{t}</div>
                <div style={{ fontSize: 12, color:"var(--muted)" }}>{s}</div>
              </div>
              <Toggle
                on={(working as any)[k]}
                onClick={() => setWorking(p => ({ ...(p as any), [k]: !(p as any)[k] }))}
                label={String(t)}
              />
            </div>
          ))}
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section title="Feature Test Tools" subtitle="Use these to validate core flows quickly">
          <div className="row">
            <button type="button" className="btn-pill" onClick={() => pushTestAlert("Critical")}>Test Critical Alert</button>
            <button type="button" className="btn-pill" onClick={() => pushTestAlert("LowStock")}>Test Low Alert</button>
            <button type="button" className="btn-pill" onClick={() => pushTestAlert("OutOfStock")}>Test Out-of-Stock Alert</button>
            <button type="button" className="btn-pill" onClick={runTestAdjustment}>Test Stock Adjustment</button>
            <button type="button" className="btn-pill" onClick={acknowledgeAll}>Test Acknowledge All</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            Test alerts should appear as right-side banners when created.
          </div>
        </Section>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Inventory Settings" subtitle="Configure inventory defaults">
          <div className="grid-2">
            <label className="form-field">
              <span>Default Low Stock Level</span>
              <input type="number" min={0} value={working.defaultLowStockLevel} onChange={(e)=>setWorking(p=>({ ...p, defaultLowStockLevel: Math.max(0, Number(e.target.value) || 0) }))} />
            </label>
            <label className="form-field">
              <span>Default Critical Level</span>
              <input type="number" min={0} value={working.defaultCriticalLevel} onChange={(e)=>setWorking(p=>({ ...p, defaultCriticalLevel: Math.max(0, Number(e.target.value) || 0) }))} />
            </label>
            <label className="form-field">
              <span>Default Reorder Point</span>
              <input type="number" min={0} value={working.defaultReorderPoint} onChange={(e)=>setWorking(p=>({ ...p, defaultReorderPoint: Math.max(0, Number(e.target.value) || 0) }))} />
            </label>
            <label className="form-field">
              <span>Default Max Level</span>
              <input type="number" min={1} value={working.defaultMaxLevel} onChange={(e)=>setWorking(p=>({ ...p, defaultMaxLevel: Math.max(1, Number(e.target.value) || 1) }))} />
            </label>
            <label className="form-field">
              <span>Overview Summary Star Limit</span>
              <input type="number" min={1} max={100} value={working.summaryWatchLimit} onChange={(e)=>setWorking(p=>({ ...p, summaryWatchLimit: Math.max(1, Number(e.target.value) || 1) }))} />
            </label>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color:"var(--muted)" }}>
            These defaults are applied when creating new inventory items.
          </div>
        </Section>

        <Section title="Display Settings" subtitle="Customize how data is displayed">
          <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Date Format</div>
          <input value={working.dateFormat} onChange={(e)=>setWorking(p=>({ ...p, dateFormat: e.target.value as any }))} placeholder="MM/DD/YYYY" />

          <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 12, marginBottom: 6 }}>Timezone</div>
          <select value={working.timezone} onChange={(e)=>setWorking(p=>({ ...p, timezone: e.target.value }))}>
            {["America/Chicago", "America/New_York", "America/Los_Angeles", "UTC"].map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>

          <div style={{ fontSize: 12, color:"var(--muted)", marginTop: 12, marginBottom: 6 }}>Currency</div>
          <select value={working.currencyCode} onChange={(e)=>setWorking(p=>({ ...p, currencyCode: e.target.value as any }))}>
            {["USD", "EUR", "GBP", "CAD"].map(ccy => (
              <option key={ccy} value={ccy}>{ccy}</option>
            ))}
          </select>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Show Low Stock Alerts</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Display alerts for items with low stock on the dashboard</div>
            </div>
            <Toggle on={working.showLowStockOnDashboard} onClick={() => setWorking(p=>({ ...p, showLowStockOnDashboard: !p.showLowStockOnDashboard }))} label="Show Low Stock Alerts" />
          </div>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Compact Mode</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Reduce spacing and show more items on screen</div>
            </div>
            <Toggle on={working.compactMode} onClick={() => setWorking(p=>({ ...p, compactMode: !p.compactMode }))} label="Compact Mode" />
          </div>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Show Item ID</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Display inventory item IDs in tables</div>
            </div>
            <Toggle on={working.showItemId} onClick={() => setWorking(p=>({ ...p, showItemId: !p.showItemId }))} label="Show Item ID" />
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section title="Manager Notifications" subtitle="Keep leadership informed automatically">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Weekly Digest</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Send summary reports with trends, low-stock items, and exceptions</div>
            </div>
            <Toggle on={working.weeklyDigestEnabled} onClick={() => setWorking(p=>({ ...p, weeklyDigestEnabled: !p.weeklyDigestEnabled }))} label="Weekly Digest" />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Digest Recipients</div>
            <input
              value={working.digestRecipients}
              onChange={(e)=>setWorking(p=>({ ...p, digestRecipients: e.target.value }))}
              className="search"
              style={{ maxWidth:"none" }}
              placeholder="manager@company.com; ops@company.com"
            />
          </div>
        </Section>
      </div>
        </>
      )}

      {activeTab === "Inventory" && (
        <>

      <div style={{ marginTop: 12 }}>
        <Section title="Inventory Change Log" subtitle="Generate printable log reports for any date range up to 1 year">
          <div className="row" style={{ alignItems: "end" }}>
            <label className="form-field">
              <span>From</span>
              <input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
            </label>
            <label className="form-field">
              <span>To</span>
              <input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
            </label>
            <button type="button" className="btn-accent" onClick={printLogReport}>Print Log Report</button>
          </div>

          <div className="inventory-table-wrap" style={{ marginTop: 12 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Timestamp</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Office</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Item</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Action</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 200).map(l => (
                  <tr key={l.id}>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{new Date(l.timestamp).toLocaleString()}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{l.office}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", fontWeight: 650 }}>{l.itemName}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>{l.action}</td>
                    <td style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)", color:"var(--muted)" }}>{l.details ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>Date range is capped to 365 days automatically.</div>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section title="Office-Based Thresholds" subtitle="Set stock thresholds per office for more accurate alerts">
          <div className="row" style={{ alignItems: "end", marginBottom: 10 }}>
            <label className="form-field" style={{ flex: 1 }}>
              <span>Add office location</span>
              <input
                value={officeDraft}
                onChange={(e)=>setOfficeDraft(e.target.value)}
                placeholder="e.g. Chicago HQ"
              />
            </label>
            <button type="button" className="btn-accent" onClick={handleAddOffice}>Add Office</button>
          </div>

          <div className="inventory-table-wrap">
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign:"left", color:"var(--muted)" }}>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Office</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Low Stock</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Critical</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Reorder</th>
                  <th style={{ padding:"10px 6px", borderBottom:"1px solid var(--border)" }}>Max</th>
                </tr>
              </thead>
              <tbody>
                {officeOptions.filter(o => o !== "All Offices").map(o => {
                  const t = working.officeThresholds.find(x => x.office === o) ?? {
                    office: o,
                    lowStockLevel: working.defaultLowStockLevel,
                    criticalLevel: working.defaultCriticalLevel,
                    reorderPoint: working.defaultReorderPoint,
                    maxLevel: working.defaultMaxLevel
                  };
                  return (
                    <tr key={o}>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid var(--border)", fontWeight: 700 }}>
                        <span className="row" style={{ gap: 8 }}>
                          {o}
                          <button
                            type="button"
                            onClick={() => removeOffice(o)}
                            title="Remove office"
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontWeight: 700 }}
                          >
                            ×
                          </button>
                        </span>
                      </td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid var(--border)" }}><input type="number" min={0} value={t.lowStockLevel} onChange={(e)=>upsertOfficeThreshold(o, { lowStockLevel: Math.max(0, Number(e.target.value) || 0) })} /></td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid var(--border)" }}><input type="number" min={0} value={t.criticalLevel} onChange={(e)=>upsertOfficeThreshold(o, { criticalLevel: Math.max(0, Number(e.target.value) || 0) })} /></td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid var(--border)" }}><input type="number" min={0} value={t.reorderPoint} onChange={(e)=>upsertOfficeThreshold(o, { reorderPoint: Math.max(0, Number(e.target.value) || 0) })} /></td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid var(--border)" }}><input type="number" min={1} value={t.maxLevel} onChange={(e)=>upsertOfficeThreshold(o, { maxLevel: Math.max(1, Number(e.target.value) || 1) })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            Add/remove offices here. Offices with active inventory/history cannot be removed.
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 12 }}>
        <Section title="Category Management" subtitle="Create and manage inventory categories">
          <div className="row" style={{ alignItems: "end" }}>
            <label className="form-field" style={{ flex: 1 }}>
              <span>Add category</span>
              <input
                value={categoryDraft}
                onChange={(e)=>setCategoryDraft(e.target.value)}
                placeholder="e.g. Network Equipment"
              />
            </label>
            <button type="button" className="btn-accent" onClick={handleAddCategory}>Add Category</button>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            {categories.map(c => (
              <span key={c} className="pill neutral" style={{ gap: 8 }}>
                {c}
                <button
                  type="button"
                  onClick={() => removeCategory(c)}
                  title="Remove category"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontWeight: 700 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            Categories assigned to existing items cannot be removed.
          </div>
        </Section>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Data & Sync" subtitle="Configure data synchronization and backup settings">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Auto Sync</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Automatically synchronize data in the background</div>
            </div>
            <Toggle on={working.syncEnabled} onClick={() => setWorking(p=>({ ...p, syncEnabled: !p.syncEnabled }))} label="Auto Sync" />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Sync Interval</div>
            <input type="number" min={1} value={working.syncIntervalMins} onChange={(e)=>setWorking(p=>({ ...p, syncIntervalMins: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Auto Refresh (seconds)</div>
            <input type="number" min={5} step={5} value={working.autoRefreshSeconds} onChange={(e)=>setWorking(p=>({ ...p, autoRefreshSeconds: Math.max(5, Number(e.target.value) || 5) }))} />
          </div>
        </Section>

        <Section title="Forecast Settings" subtitle="Configure inventory demand forecasting">
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <label className="form-field">
              <span>Shipping Lead Time (days)</span>
              <input type="number" min={0} value={working.shippingLeadTimeDays} onChange={(e)=>setWorking(p=>({ ...p, shippingLeadTimeDays: Math.max(0, Number(e.target.value) || 0) }))} />
            </label>
            <label className="form-field">
              <span>Shipping Buffer (days)</span>
              <input type="number" min={0} value={working.shippingBufferDays} onChange={(e)=>setWorking(p=>({ ...p, shippingBufferDays: Math.max(0, Number(e.target.value) || 0) }))} />
            </label>
          </div>
          <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Forecast Window</div>
          <input type="number" min={1} value={working.forecastWindowDays} onChange={(e)=>setWorking(p=>({ ...p, forecastWindowDays: Math.max(1, Number(e.target.value) || 1) }))} />
        </Section>
      </div>
        </>
      )}

      {activeTab === "Security" && (
        <>
      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Data & Sync" subtitle="Configure data synchronization and backup settings">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Auto Sync</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Automatically synchronize data in the background</div>
            </div>
            <Toggle on={working.syncEnabled} onClick={() => setWorking(p=>({ ...p, syncEnabled: !p.syncEnabled }))} label="Auto Sync" />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Sync Interval</div>
            <input type="number" min={1} value={working.syncIntervalMins} onChange={(e)=>setWorking(p=>({ ...p, syncIntervalMins: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Auto Refresh (seconds)</div>
            <input type="number" min={5} step={5} value={working.autoRefreshSeconds} onChange={(e)=>setWorking(p=>({ ...p, autoRefreshSeconds: Math.max(5, Number(e.target.value) || 5) }))} />
          </div>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Enable Backups</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Automatically backup your data</div>
            </div>
            <Toggle on={working.backupsEnabled} onClick={() => setWorking(p=>({ ...p, backupsEnabled: !p.backupsEnabled }))} label="Enable Backups" />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Backup Frequency</div>
            <input value={working.backupFrequency} onChange={(e)=>setWorking(p=>({ ...p, backupFrequency: e.target.value }))} placeholder="Daily" />
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn-pill">Sync Now</button>
          </div>
        </Section>

        <Section title="Forecast Settings" subtitle="Configure inventory demand forecasting">
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <label className="form-field">
              <span>Shipping Lead Time (days)</span>
              <input
                type="number"
                min={0}
                value={working.shippingLeadTimeDays}
                onChange={(e)=>setWorking(p=>({ ...p, shippingLeadTimeDays: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </label>
            <label className="form-field">
              <span>Shipping Buffer (days)</span>
              <input
                type="number"
                min={0}
                value={working.shippingBufferDays}
                onChange={(e)=>setWorking(p=>({ ...p, shippingBufferDays: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </label>
          </div>

          <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Forecast Window</div>
          <input type="number" min={1} value={working.forecastWindowDays} onChange={(e)=>setWorking(p=>({ ...p, forecastWindowDays: Math.max(1, Number(e.target.value) || 1) }))} />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Lookback Period</div>
            <input type="number" min={1} value={working.lookbackDays} onChange={(e)=>setWorking(p=>({ ...p, lookbackDays: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color:"var(--muted)" }}>
            Forecasts are calculated based on stock adjustment history. Items with &quot;Remove&quot; adjustments will show projected depletion.
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Quick Adjustment Step</div>
            <input type="number" min={1} value={working.quickAdjustmentStep} onChange={(e)=>setWorking(p=>({ ...p, quickAdjustmentStep: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>
        </Section>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <Section title="Manager Controls" subtitle="Operational controls for managers and supervisors">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Require Adjustment Reason</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Force staff to include a reason for stock changes</div>
            </div>
            <Toggle on={working.requireAdjustmentReason} onClick={() => setWorking(p=>({ ...p, requireAdjustmentReason: !p.requireAdjustmentReason }))} label="Require Adjustment Reason" />
          </div>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Manager Approval Required</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Require approval for bulk edits and destructive actions</div>
            </div>
            <Toggle on={working.managerApprovalRequired} onClick={() => setWorking(p=>({ ...p, managerApprovalRequired: !p.managerApprovalRequired }))} label="Manager Approval Required" />
          </div>

          <div className="row" style={{ justifyContent:"space-between", marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Allow Item Deletion</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Disable to prevent permanent deletion of inventory items</div>
            </div>
            <Toggle on={working.allowItemDeletion} onClick={() => setWorking(p=>({ ...p, allowItemDeletion: !p.allowItemDeletion }))} label="Allow Item Deletion" />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Export Format</div>
            <input value={working.exportFormat} onChange={(e)=>setWorking(p=>({ ...p, exportFormat: e.target.value }))} placeholder="CSV" />
          </div>
        </Section>

        <Section title="Security & Compliance" subtitle="Policy settings for secure administration">
          <div className="row" style={{ justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Require MFA for Managers</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Adds extra sign-in verification for manager accounts</div>
            </div>
            <Toggle on={working.requireMfaForManagers} onClick={() => setWorking(p=>({ ...p, requireMfaForManagers: !p.requireMfaForManagers }))} label="Require MFA for Managers" />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Session Timeout</div>
            <input type="number" min={1} value={working.sessionTimeoutMins} onChange={(e)=>setWorking(p=>({ ...p, sessionTimeoutMins: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color:"var(--muted)", marginBottom: 6 }}>Audit Log Retention</div>
            <input type="number" min={1} value={working.auditLogRetentionDays} onChange={(e)=>setWorking(p=>({ ...p, auditLogRetentionDays: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>
        </Section>
      </div>
        </>
      )}

      {activeTab === "About" && (
      <div style={{ marginTop: 12 }}>
        <Section title="About Inventory Guardian" subtitle="Application information">
          <div className="row" style={{ alignItems:"flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background:"var(--accent)", color:"#fff", display:"grid", placeItems:"center", fontWeight: 800 }}>IG</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900 }}>Inventory Guardian</div>
              <div style={{ fontSize: 12, color:"var(--muted)" }}>Inventory Management System</div>
              <div style={{ marginTop: 10, display:"grid", gridTemplateColumns:"120px 1fr", rowGap: 8, columnGap: 12, fontSize: 13 }}>
                <div style={{ color:"var(--muted)" }}>Version</div><div>1.0.0</div>
                <div style={{ color:"var(--muted)" }}>Environment</div><div>Production</div>
                <div style={{ color:"var(--muted)" }}>Data Storage</div><div>SharePoint (planned) / Mock (current)</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color:"var(--muted)" }}>
                Track inventory, manage stock adjustments, generate reports, forecast demand, and configure thresholds per location.
              </div>
            </div>
          </div>
        </Section>
      </div>
      )}
    </div>
  );
}
