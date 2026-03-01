import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { alerts as seedAlerts, adjustments as seedAdjustments, defaultSettings, items as seedItems, offices as seedOfficeOptions } from "./mock";
import { Alert, InventoryChangeLog, InventoryItem, SettingsModel, StockAdjustment, StockAdjustmentType } from "./types";
import dayjs from "dayjs";

export type OfficeScope = string; // "All Offices" | specific office

type Store = {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;

  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;

  alerts: Alert[];
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;

  settings: SettingsModel;
  setSettings: React.Dispatch<React.SetStateAction<SettingsModel>>;

  // Global Office filter
  office: OfficeScope;
  setOffice: React.Dispatch<React.SetStateAction<OfficeScope>>;
  globalSearch: string;
  setGlobalSearch: React.Dispatch<React.SetStateAction<string>>;
  officeOptions: string[];
  categories: string[];

  // Derived scoped datasets
  scopedItems: InventoryItem[];
  scopedAdjustments: StockAdjustment[];
  scopedAlerts: Alert[];
  changeLogs: InventoryChangeLog[];

  // Actions
  addAdjustment: (args: { itemId: string; type: StockAdjustmentType; quantity: number; reason?: string; office?: string; }) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  addOffice: (name: string) => void;
  removeOffice: (name: string) => boolean;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => boolean;
};

const Ctx = createContext<Store | null>(null);

function applyOffice<T extends { office: string }>(rows: T[], office: OfficeScope): T[] {
  if (office === "All Offices") return rows;
  return rows.filter(r => r.office === office);
}

function qMatch(values: Array<string | number | undefined>, q: string) {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return values.some(v => String(v ?? "").toLowerCase().includes(needle));
}

function thresholdForOffice(settings: SettingsModel, officeName: string) {
  return settings.officeThresholds.find(t => t.office === officeName) ?? {
    office: officeName,
    lowStockLevel: settings.defaultLowStockLevel,
    criticalLevel: settings.defaultCriticalLevel,
    reorderPoint: settings.defaultReorderPoint,
    maxLevel: settings.defaultMaxLevel
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(seedItems);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(seedAdjustments);
  const [alerts, setAlerts] = useState<Alert[]>(seedAlerts);
  const [settings, setSettings] = useState<SettingsModel>(defaultSettings);
  const [officeOptions, setOfficeOptions] = useState<string[]>(seedOfficeOptions);
  const [categories, setCategories] = useState<string[]>(Array.from(new Set(seedItems.map(i => i.category))).sort());
  const [changeLogs, setChangeLogs] = useState<InventoryChangeLog[]>([]);
  const prevItemsRef = useRef<InventoryItem[]>(seedItems);

  const [office, setOffice] = useState<OfficeScope>("All Offices");
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.themeMode);
    document.documentElement.setAttribute("data-density", settings.densityMode);
    document.documentElement.style.setProperty("--accent", settings.accent);
    document.documentElement.style.setProperty("--accent-weak", `${settings.accent}22`);
  }, [settings.themeMode, settings.densityMode, settings.accent]);

  const normalizedItems = useMemo(() => {
    const lookbackDays = Math.max(1, settings.lookbackDays || 30);
    const cutoff = dayjs().subtract(lookbackDays, "day");

    const usageByItem = new Map<string, number>();
    for (const adj of adjustments) {
      const parsed = dayjs(adj.date);
      if (!parsed.isValid() || parsed.isBefore(cutoff)) continue;
      if (adj.quantity >= 0) continue;
      usageByItem.set(adj.itemId, (usageByItem.get(adj.itemId) ?? 0) + Math.abs(adj.quantity));
    }

    return items.map(i => {
      const t = thresholdForOffice(settings, i.office);
      const consumption = usageByItem.get(i.id) ?? 0;
      const autoAvgDailyUsage = Number((consumption / lookbackDays).toFixed(2));
      return {
        ...i,
        lowStockLevel: t.lowStockLevel,
        criticalLevel: t.criticalLevel,
        // Keep reorder point at the item level so each item can override office defaults.
        // Office-level reorder thresholds remain configurable in Settings and can be used as defaults.
        reorderPoint: i.reorderPoint,
        maxLevel: t.maxLevel,
        avgDailyUsage: autoAvgDailyUsage
      };
    });
  }, [items, settings, adjustments]);

  const scopedItems = useMemo(() => {
    return applyOffice(normalizedItems, office).filter(i =>
      qMatch([i.id, i.name, i.category, i.office, i.location], globalSearch)
    );
  }, [normalizedItems, office, globalSearch]);

  const scopedAdjustments = useMemo(() => {
    return applyOffice(adjustments, office).filter(a =>
      qMatch([a.id, a.itemName, a.type, a.reason, a.office, a.date], globalSearch)
    );
  }, [adjustments, office, globalSearch]);

  const scopedAlerts = useMemo(() => {
    return applyOffice(alerts, office).filter(a =>
      qMatch([a.itemName, a.type, a.message, a.category, a.location, a.office], globalSearch)
    );
  }, [alerts, office, globalSearch]);

  useEffect(() => {
    const previous = prevItemsRef.current;
    const prevMap = new Map(previous.map(i => [i.id, i]));
    const currentMap = new Map(items.map(i => [i.id, i]));

    const detected: InventoryChangeLog[] = [];
    const stamp = new Date().toISOString();

    for (const item of items) {
      const before = prevMap.get(item.id);
      if (!before) {
        detected.push({
          id: `log-${Math.random().toString(16).slice(2)}`,
          timestamp: stamp,
          office: item.office,
          itemId: item.id,
          itemName: item.name,
          action: "Item Created",
          details: `Qty ${item.qty}, location ${item.location}`
        });
        continue;
      }

      const changed = before.qty !== item.qty || before.location !== item.location || before.category !== item.category || before.office !== item.office || before.name !== item.name;
      if (changed) {
        detected.push({
          id: `log-${Math.random().toString(16).slice(2)}`,
          timestamp: stamp,
          office: item.office,
          itemId: item.id,
          itemName: item.name,
          action: "Item Updated",
          details: `Qty ${before.qty} → ${item.qty}, ${before.location} → ${item.location}`
        });
      }
    }

    for (const oldItem of previous) {
      if (!currentMap.has(oldItem.id)) {
        detected.push({
          id: `log-${Math.random().toString(16).slice(2)}`,
          timestamp: stamp,
          office: oldItem.office,
          itemId: oldItem.id,
          itemName: oldItem.name,
          action: "Item Deleted",
          details: `Removed from ${oldItem.location}`
        });
      }
    }

    if (detected.length) {
      setChangeLogs(prev => [...detected, ...prev].slice(0, 5000));
    }

    prevItemsRef.current = items;
  }, [items]);

  const addAdjustment: Store["addAdjustment"] = ({ itemId, type, quantity, reason, office: officeOverride }) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const officeToUse = officeOverride ?? item.office ?? (office === "All Offices" ? "Austin" : office);

    const signed = type === "Add" ? Math.abs(quantity) : -Math.abs(quantity);

    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      return { ...i, qty: Math.max(0, i.qty + signed), updatedAt: new Date().toISOString() };
    }));

    const adj: StockAdjustment = {
      id: `adj-${Math.random().toString(16).slice(2)}`,
      itemId,
      itemName: item.name,
      type,
      quantity: signed,
      reason,
      date: dayjs().format("MM/DD/YYYY"),
      createdAt: new Date().toISOString(),
      office: officeToUse
    };
    setAdjustments(prev => [adj, ...prev]);
    setChangeLogs(prev => [{
      id: `log-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      office: officeToUse,
      itemId,
      itemName: item.name,
      action: `Adjustment ${type}`,
      details: `${signed > 0 ? "+" : ""}${signed} (${reason ?? "No reason"})`
    }, ...prev].slice(0, 5000));

    const threshold = thresholdForOffice(settings, officeToUse);
    const newQty = Math.max(0, item.qty + signed);
    const generated: Alert[] = [];

    if (newQty === 0) {
      generated.push({
        id: `al-${Math.random().toString(16).slice(2)}`,
        itemId,
        itemName: item.name,
        category: item.category,
        location: item.location,
        office: officeToUse,
        type: "OutOfStock",
        priority: "High",
        message: `${item.name} is out of stock`,
        acknowledged: false,
        createdAt: new Date().toISOString()
      });
    } else if (newQty <= threshold.criticalLevel) {
      generated.push({
        id: `al-${Math.random().toString(16).slice(2)}`,
        itemId,
        itemName: item.name,
        category: item.category,
        location: item.location,
        office: officeToUse,
        type: "Critical",
        priority: "High",
        message: `${item.name} has reached critical level (${newQty} units remaining)`,
        acknowledged: false,
        createdAt: new Date().toISOString()
      });
    } else if (newQty <= threshold.lowStockLevel) {
      generated.push({
        id: `al-${Math.random().toString(16).slice(2)}`,
        itemId,
        itemName: item.name,
        category: item.category,
        location: item.location,
        office: officeToUse,
        type: "LowStock",
        priority: "Medium",
        message: `${item.name} is running low (${newQty} units remaining)`,
        acknowledged: false,
        createdAt: new Date().toISOString()
      });
    }

    if (generated.length) setAlerts(prev => [...generated, ...prev]);
  };

  const acknowledgeAlert = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  const acknowledgeAll = () => setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
  const addOffice = (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    setOfficeOptions(prev => {
      if (prev.some(o => o.toLowerCase() === clean.toLowerCase())) return prev;
      return ["All Offices", ...prev.filter(o => o !== "All Offices"), clean];
    });

    setSettings(prev => {
      if (prev.officeThresholds.some(t => t.office.toLowerCase() === clean.toLowerCase())) return prev;
      return {
        ...prev,
        officeThresholds: [
          ...prev.officeThresholds,
          {
            office: clean,
            lowStockLevel: prev.defaultLowStockLevel,
            criticalLevel: prev.defaultCriticalLevel,
            reorderPoint: prev.defaultReorderPoint,
            maxLevel: prev.defaultMaxLevel
          }
        ]
      };
    });
  };

  const removeOffice = (name: string) => {
    if (name === "All Offices") return false;
    const inUse = items.some(i => i.office === name) || adjustments.some(a => a.office === name) || alerts.some(a => a.office === name);
    if (inUse) return false;

    setOfficeOptions(prev => prev.filter(o => o !== name));
    setOffice(prev => prev === name ? "All Offices" : prev);
    setSettings(prev => ({ ...prev, officeThresholds: prev.officeThresholds.filter(t => t.office !== name) }));
    return true;
  };

  const addCategory = (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    setCategories(prev => {
      if (prev.some(c => c.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, clean].sort((a, b) => a.localeCompare(b));
    });
  };

  const removeCategory = (name: string) => {
    const inUse = items.some(i => i.category === name);
    if (inUse) return false;
    setCategories(prev => prev.filter(c => c !== name));
    return true;
  };

  const value = useMemo<Store>(() => ({
    items, setItems,
    adjustments, setAdjustments,
    alerts, setAlerts,
    settings, setSettings,

    office, setOffice,
    globalSearch, setGlobalSearch,
    officeOptions,
    categories,

    scopedItems,
    scopedAdjustments,
    scopedAlerts,
    changeLogs,

    addAdjustment,
    acknowledgeAlert,
    acknowledgeAll,
    addOffice,
    removeOffice,
    addCategory,
    removeCategory
  }), [items, adjustments, alerts, settings, office, globalSearch, officeOptions, categories, scopedItems, scopedAdjustments, scopedAlerts, changeLogs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
